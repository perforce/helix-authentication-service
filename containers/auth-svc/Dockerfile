FROM node:14-slim

ENV DEBIAN_FRONTEND noninteractive
RUN apt-get -q update && \
    apt-get -q -y install git

WORKDIR /service
COPY bin bin
COPY certs certs
COPY lib lib
COPY package.json .
COPY package-lock.json .
COPY public public
COPY routes routes
COPY views views
# Use npm ci for a predictable install. Only install the production dependencies
# to save space. Avoid the optional dependencies, especially unix-dgram which
# requires node-gyp, which in turn requires Python, which would make this image
# much larger without any benefit.
RUN npm ci -q --only=prod --no-optional

COPY containers/auth-svc/saml_idp.conf.js routes

EXPOSE ${PORT}

HEALTHCHECK CMD curl -k -f -s -I http://localhost:${PORT}/ || exit 1

ENTRYPOINT [ "node", "bin/www" ]
