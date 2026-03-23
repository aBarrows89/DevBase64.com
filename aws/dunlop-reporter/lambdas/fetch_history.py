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
    try:
        # List all log objects
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
                    logs.append(log_data)
                except Exception:
                    continue  # Skip corrupted logs

        # Sort newest first by timestamp
        logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

        return _response(200, logs)

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
