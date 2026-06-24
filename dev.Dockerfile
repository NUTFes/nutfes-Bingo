# syntax=docker.io/docker/dockerfile:1

FROM node:26.2.0-alpine

WORKDIR /app
RUN npm i -g pnpm@11.2.2

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* pnpm-workspace.yaml .npmrc* ./

RUN pnpm i --frozen-lockfile --ignore-scripts --prefer-offline

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV CI=true

CMD ["pnpm", "dev", "-H", "0.0.0.0"]
