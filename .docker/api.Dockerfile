FROM hasura/graphql-engine:v2.36.6@sha256:3fc234510962e66d5ca7db16734b8796a16fb729953915861953e974f976f30f
WORKDIR /hasura/api

# Hasura CLIのインストール
RUN curl -L https://github.com/hasura/graphql-engine/raw/stable/cli/get.sh | bash

# MinIOクライアント（mc）のインストール
RUN curl -L https://dl.min.io/client/mc/release/linux-amd64/mc -o /usr/local/bin/mc && \
    chmod +x /usr/local/bin/mc

# 必要なパッケージのインストール
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
