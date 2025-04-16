#!/bin/bash

if [ $# -eq 0 ]; then
    echo "Usage: $0 /path/to/file"
    exit 1
fi

FILE_PATH="$1"

if [ ! -f "$FILE_PATH" ]; then
    echo "Error: File '$FILE_PATH' does not exist"
    exit 1
fi

# Get MIME type using file command
MIME_TYPE=$(file --mime-type -b "$FILE_PATH")
FILE_SIZE=$(stat -c%s "$FILE_PATH")

echo "Detected MIME type: $MIME_TYPE"

# Make initial request and capture response headers
RESPONSE_HEADERS=$(curl -v -X PUT \
  -H "Content-Length: $FILE_SIZE" \
  -H "Content-Type: $MIME_TYPE" \
  --data-binary "@$FILE_PATH" \
  -w "%{http_code}" \
  -o /dev/null \
  "http://localhost:3000/upload")

# If status code is 402, retry with Cashu token
if [ "$RESPONSE_HEADERS" -eq 402 ]; then
    echo "Payment required. Generating Cashu token..."

    # Generate Cashu token using nak wallet
    CASHU_TOKEN=$(nak wallet send "$FILE_SIZE")

    if [ $? -ne 0 ]; then
        echo "Error generating Cashu token"
        exit 1
    fi

    echo "Retrying request with Cashu token..."
    curl -v -X PUT \
      -H "Content-Length: $FILE_SIZE" \
      -H "Content-Type: $MIME_TYPE" \
      -H "X-Cashu: $CASHU_TOKEN" \
      --data-binary "@$FILE_PATH" \
      "http://localhost:3000/upload"
fi
