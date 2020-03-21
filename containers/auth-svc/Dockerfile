FROM node:12-stretch

ENV DEBIAN_FRONTEND noninteractive

WORKDIR /svc
COPY bin bin
COPY certs certs
COPY lib lib
COPY package.json .
COPY public public
COPY routes routes
COPY views views
RUN rm -f package-lock.json && npm install -q

COPY containers/auth-svc/saml_idp.conf.js routes

EXPOSE 3000

HEALTHCHECK CMD curl -k -f -s -I https://localhost:3000/ || exit 1

ENTRYPOINT [ "node", "-r", "module-alias/register", "bin/www" ]
