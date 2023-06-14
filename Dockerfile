# ベースイメージの作成(Nodeの入ったLinuxの箱を用意)
FROM node:17.6.0
# コンテナ内で作業するディレクトリを指定
WORKDIR /app
COPY ./view-user /app
