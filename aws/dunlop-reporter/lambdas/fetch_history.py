"""
Lambda: fetch-history
Trigger: API Gateway GET /dunlop/history
Lists and reads run logs from S3, returns sorted newest first.
"""

import json
import os
import boto3

S3_BUCKET = os.environ.get("S3_RUN_LOGS_BUCKET", "ietires-dunlop-run-logs")
S3_PREFIX = "run-logs/"

s3 = boto3.client("s3")


def handler(event, context):
    http_method = event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method", "GET")

    if http_method == "DELETE":
        return _handle_delete(event)

    return _handle_list()


def _handle_list():
    try:
        paginator = s3.get_paginator("list_objects_v2")
        logs = []

        for page in paginator.paginate(Bucket=S3_BUCKET, Prefix=S3_PREFIX):
            for obj in page.get("Contents", []):
                key = obj["Key"]
                if not key.endswith(".json"):
                    continue
                try:
                    resp = s3.get_object(Bucket=S3_BUCKET, Key=key)
                    log_data = json.loads(resp["Body"].read().decode("utf-8"))
                    log_data["_s3Key"] = key
                    logs.append(log_data)
                except Exception:
                    continue

        logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return _response(200, logs)

    except Exception as e:
        return _response(500, {"error": str(e)})


def _handle_delete(event):
    try:
        body = json.loads(event.get("body", "{}"))
        month = body.get("month")
        timestamp = body.get("timestamp")

        if not month or not timestamp:
            return _response(400, {"error": "month and timestamp are required"})

        # Build the expected S3 key directly from the timestamp
        safe_ts = timestamp.replace(":", "-")
        expected_key = f"run-logs/{month}_{safe_ts}.json"

        # Direct delete by constructed key
        s3.delete_object(Bucket=S3_BUCKET, Key=expected_key)

        # Verify it was deleted (delete_object succeeds even if key doesn't exist)
        try:
            s3.head_object(Bucket=S3_BUCKET, Key=expected_key)
            # If we get here, the key still exists — shouldn't happen
            return _response(500, {"error": f"Delete failed for key: {expected_key}"})
        except s3.exceptions.ClientError:
            # Key no longer exists — success
            return _response(200, {"success": True, "key": expected_key})

    except Exception as e:
        return _response(500, {"error": str(e)})


def _response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body),
    }
