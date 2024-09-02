#!/bin/bash

connection_count=0
max_connection_count=0

sudo docker compose -f docker-compose.prod.yml logs -f api 2>/dev/null | while read -r line
do
  if echo "$line" | grep -q "accepted"; then
    ((connection_count++))
    if (( connection_count > max_connection_count )); then
      max_connection_count=$connection_count
    fi
  elif echo "$line" | grep -q "closed"; then
    ((connection_count--))
  fi
  echo -ne "現在の同時接続数: $connection_count, 最大同時接続数: $max_connection_count\r"
done