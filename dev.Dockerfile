# syntax=docker.io/docker/dockerfile:1

FROM node:26.2.0-alpine@sha256:7c6af15abe4e3de859690e7db171d0d711bf37d27528eddfe625b2fe89e097f8

WORKDIR /app
RUN npm i -g pnpm@11.2.2

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./

RUN pnpm i --frozen-lockfile --ignore-scripts --prefer-offline

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV CI=true

CMD ["pnpm", "dev", "-H", "0.0.0.0"]
