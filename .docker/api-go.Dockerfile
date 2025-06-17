FROM golang:latest

RUN apt-get update
RUN apt-get upgrade -y
RUN apt-get install -y locales \
  && locale-gen ja_JP.UTF-8 \
  && echo "export LANG=ja_JP.UTF-8" >> ~/.bashrc

#言語を日本語に変更する
RUN export LANG=C.UTF-8
RUN export LANGUAGE=en_US:

ENV CGO_ENABLED=0
ENV GOOS=linux
#ENV GOARCH=amd64

RUN mkdir /go/src/api

WORKDIR /go/src/api

#swaggerとairのインストール
RUN go install github.com/swaggo/swag/cmd/swag@v1.8.12
RUN go install github.com/air-verse/air@latest
CMD ["air", "-c", ".air.toml"]
