# syntax = docker/dockerfile:1.2
FROM node:18.16

COPY ./install-mecab-docker.sh /install-mecab-docker.sh
RUN ./install-mecab-docker.sh

COPY . /
WORKDIR /

# build
RUN ./build-script.sh

RUN --mount=type=secret,id=_env,dst=/etc/secrets/.env cat /etc/secrets/.env

CMD pnpm start