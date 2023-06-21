FROM node:18.16

COPY . /

WORKDIR /

# build
RUN ./build-script.sh

CMD pnpm start