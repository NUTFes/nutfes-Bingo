FROM hasura/graphql-engine:latest.cli-migrations-v3
WORKDIR /tmp/hasura-project
# WORKDIR /hasura
RUN curl -L https://github.com/hasura/graphql-engine/raw/stable/cli/get.sh | bash
RUN apt install postgresql-client
