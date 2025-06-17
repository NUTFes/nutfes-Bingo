FROM hasura/graphql-engine:v2.36.6@sha256:3fc234510962e66d5ca7db16734b8796a16fb729953915861953e974f976f30f
WORKDIR /hasura/api
RUN curl -L https://github.com/hasura/graphql-engine/raw/stable/cli/get.sh | bash
