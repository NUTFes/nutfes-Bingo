# syntax=docker.io/docker/dockerfile:1

FROM node:24-alpine

WORKDIR /app

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* ./

RUN corepack enable pnpm && pnpm i --frozen-lockfile --ignore-scripts --prefer-offline

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

CMD ["pnpm", "dev", "-H", "0.0.0.0"]
