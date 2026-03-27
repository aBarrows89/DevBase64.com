"""
Scanner Status Lambda
Triggered by IoT Rule when device shadow updates.
Forwards telemetry to Convex via HTTP endpoint.
"""

import json
import os
import urllib.request
import boto3

secrets = boto3.client("secretsmanager")

CONVEX_URL = os.environ.get("CONVEX_URL")
SECRETS_ARN = os.environ.get("SECRETS_ARN")

_cached_creds = None


def get_credentials():
    global _cached_creds
    if _cached_creds is None:
        resp = secrets.get_secret_value(SecretId=SECRETS_ARN)
        _cached_creds = json.loads(resp["SecretString"])
    return _cached_creds


def handler(event, context):
    """
    Event comes from IoT Rule SQL:
    SELECT *, topic(3) as thingName
    FROM '$aws/things/+/shadow/update/documents'
    WHERE startswith(topic(3), 'scanner-')
    """
    try:
        thing_name = event.get("thingName")
        if not thing_name:
            print("No thingName in event")
            return

        # Extract reported state from shadow update
        current = event.get("current", {}).get("state", {}).get("reported", {})
        if not current:
            print(f"No reported state for {thing_name}")
            return

        # Build telemetry payload for Convex
        telemetry = {
            "iotThingName": thing_name,
        }

        if "battery" in current:
            telemetry["batteryLevel"] = current["battery"]
        if "wifiSignal" in current:
            telemetry["wifiSignal"] = current["wifiSignal"]
        if "gps" in current and isinstance(current["gps"], dict):
            telemetry["gpsLatitude"] = current["gps"].get("lat")
            telemetry["gpsLongitude"] = current["gps"].get("lng")
        if "apps" in current and isinstance(current["apps"], dict):
            telemetry["installedApps"] = {
                "tireTrack": current["apps"].get("tireTrack"),
                "rtLocator": current["apps"].get("rtLocator"),
                "scannerAgent": current["apps"].get("scannerAgent"),
            }
        if "agentVersion" in current:
            telemetry["agentVersion"] = current["agentVersion"]
        if "androidVersion" in current:
            telemetry["androidVersion"] = current["androidVersion"]
        if "isLocked" in current:
            telemetry["isLocked"] = current["isLocked"]
        if "lastCommandAck" in current:
            telemetry["lastCommandAck"] = current["lastCommandAck"]

        # POST to Convex HTTP endpoint
        creds = get_credentials()
        webhook_secret = creds.get("webhook_secret", "")

        convex_http_url = CONVEX_URL.replace(
            ".convex.cloud", ".convex.site"
        )
        url = f"{convex_http_url}/scanner-telemetry"

        data = json.dumps(telemetry).encode()
        req = urllib.request.Request(
            url,
            data=data,
            headers={
                "Content-Type": "application/json",
                "x-webhook-secret": webhook_secret,
            },
        )

        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read())
            print(f"Telemetry forwarded for {thing_name}: {result}")

    except Exception as e:
        print(f"Error processing shadow update: {e}")
        raise
