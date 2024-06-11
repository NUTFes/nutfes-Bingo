# ベースイメージの作成(Nodeの入ったLinuxの箱を用意)
FROM node:18.17.0
# コンテナ内で作業するディレクトリを指定
WORKDIR /app
COPY ./view-admin /app