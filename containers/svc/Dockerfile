FROM node:10

ENV DEBIAN_FRONTEND noninteractive

WORKDIR /svc
COPY app.js .
COPY bin bin
COPY package.json .
COPY public public
COPY routes routes
COPY views views
RUN rm -f package-lock.json && npm install -q

EXPOSE 3000

HEALTHCHECK CMD curl -f -s -o /dev/null http://localhost:3000/ || exit 1

ENTRYPOINT [ "node",  "bin/www" ]
