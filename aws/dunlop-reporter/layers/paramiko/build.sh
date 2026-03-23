#!/bin/bash
# Build paramiko Lambda layer
# Run this on an Amazon Linux 2023 compatible environment (or via Docker)
# The output goes in layers/paramiko/python/ which SAM packages into the layer

set -e

LAYER_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET="${LAYER_DIR}/python"

rm -rf "${TARGET}"
mkdir -p "${TARGET}"

pip install paramiko -t "${TARGET}" --platform manylinux2014_x86_64 --only-binary=:all: --python-version 3.12

echo "Layer built successfully at ${TARGET}"
echo "Contents:"
ls -la "${TARGET}"
