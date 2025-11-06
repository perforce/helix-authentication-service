FROM node:24-slim

ENV DEBIAN_FRONTEND noninteractive
RUN apt-get -q update --fix-missing && \
    apt-get -q -y install curl git

WORKDIR /service
COPY bin bin
COPY certs certs
COPY defaults.env defaults.env
COPY lib lib
COPY package.json .
COPY package-lock.json .
COPY public public
COPY routes routes
# vvvvv DO NOT REMOVE, USED BY AUTOMATED TESTS vvvv
COPY containers/auth-svc/saml_idp.conf.cjs routes
# ^^^^^ DO NOT REMOVE, USED BY AUTOMATED TESTS ^^^^
COPY views views
# Use npm ci for a predictable install. Only install the production dependencies
# to save space. Avoid the optional dependencies, especially unix-dgram which
# requires node-gyp, which in turn requires Python, which would make this image
# much larger (note unix-dgram is only needed by winston-syslog).
RUN npm ci -q --only=prod --omit=optional

EXPOSE ${PORT}

HEALTHCHECK CMD curl -k -f -s -I http://localhost:${PORT}/ || exit 1

ENTRYPOINT [ "node", "bin/www.js" ]
