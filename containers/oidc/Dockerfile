FROM node:10

ENV DEBIAN_FRONTEND noninteractive

WORKDIR /oidc
COPY app.js .
COPY package.json .
COPY routes routes
COPY support support
COPY views views
RUN rm -f package-lock.json && npm install -q

EXPOSE 3000

HEALTHCHECK CMD curl -f -s -o /dev/null http://localhost:3000/.well-known/openid-configuration || exit 1

ENTRYPOINT [ "node",  "app.js" ]
