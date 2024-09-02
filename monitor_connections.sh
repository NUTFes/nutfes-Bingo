#!/bin/bash

current_connections=0
max_connections=0

HEADER_COLOR='\033[38;5;196m'
DATA_COLOR='\033[38;5;222m'
RESET_COLOR='\033[0m'

sudo docker compose -f docker-compose.prod.yml logs -f api 2>/dev/null | while read -r line; do
  if [[ "$line" == *"accepted"* ]]; then
    ((current_connections++))
    if ((current_connections > max_connections)); then
      max_connections=$current_connections
    fi
  elif [[ "$line" == *"closed"* ]]; then
    ((current_connections--))
  fi

  if [[ "$current_connections" != "$prevConnections" ]]; then
    clear
    prevConnections="$current_connections"

    echo -e "${HEADER_COLOR}BINGO CONNECTION MONITOR${RESET_COLOR}\n"
    echo -e "同時接続数: ${DATA_COLOR}$current_connections${RESET_COLOR}\n"
    echo -e "最大同時接続数: ${DATA_COLOR}$max_connections${RESET_COLOR}\n"
    echo -e "タイムスタンプ: ${DATA_COLOR}$(date +"%Y-%m-%d %H:%M:%S")${RESET_COLOR}\n"
  fi
done
