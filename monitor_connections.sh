#!/bin/bash

# Configuration
CONTAINER_NAME="realtime-dev.supabase-realtime"
PORT_HEX="0FA0" # Port 4000 in Hex

# Check if container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "Error: Container $CONTAINER_NAME is not running."
    exit 1
fi

echo "Starting connection monitor for Supabase Realtime..."
echo "Container: $CONTAINER_NAME"
echo "Listening Port: 4000 (0FA0)"
echo "---------------------------------------------------"

while true; do
    # Count IPv4 connections
    # Field 2: local_address, Field 4: state (01 = ESTABLISHED)
    TCP4_COUNT=$(docker exec "$CONTAINER_NAME" cat /proc/net/tcp 2>/dev/null | awk -v pat=":${PORT_HEX}$" '$2 ~ pat && $4 == "01" {count++} END {print count+0}')

    # Count IPv6 connections
    TCP6_COUNT=$(docker exec "$CONTAINER_NAME" cat /proc/net/tcp6 2>/dev/null | awk -v pat=":${PORT_HEX}$" '$2 ~ pat && $4 == "01" {count++} END {print count+0}')

    # Total connections
    TOTAL=$((TCP4_COUNT + TCP6_COUNT))

    # Get current timestamp
    TIMESTAMP=$(date "+%H:%M:%S")

    # Display output on the same line (using carriage return) or new line
    # Using printf to format nicely
    printf "[%s] Active Connections: %d (IPv4: %d, IPv6: %d)\n" "$TIMESTAMP" "$TOTAL" "$TCP4_COUNT" "$TCP6_COUNT"

    sleep 1
done
