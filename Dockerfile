# syntax = docker/dockerfile:1.2
FROM node:18.17.0

WORKDIR /

COPY ./install-mecab-docker.sh /install-mecab-docker.sh
RUN ./install-mecab-docker.sh

ENV MECAB_DIC_DIR="/usr/lib/x86_64-linux-gnu/mecab/dic/mecab-ipadic-neologd"

# Install pnpm
RUN npm i -g pnpm

# Files required by pnpm install
COPY package.json pnpm-lock.yaml /app/

WORKDIR /app/

RUN pnpm install

COPY . /app/

RUN pnpm build

CMD pnpm start