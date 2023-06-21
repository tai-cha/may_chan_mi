#!/bin/bash

npm i -g pnpm && pnpm i && pnpm build

apt-get -y update && apt-get -y install mecab libmecab-dev mecab-utils mecab-ipadic-utf8 git make curl xz-utils file

git clone --depth 1 https://github.com/neologd/mecab-ipadic-neologd.git

cd mecab-ipadic-neologd
./bin/install-mecab-ipadic-neologd -n -a -y
