FROM node:18-slim
#
# Run unit tests on Node.js v18 for verification of backward compatibility. This
# does not run tests that require p4d or docker containers, so it is limited in
# the extent to which it can verify compatibility.
#
# $ docker build -t has-test-node18 -f test/backward/Node18.dockerfile .
# $ docker image ls | grep has-test-node18
#
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get -q update --fix-missing && \
    apt-get -q -y install build-essential git python3
WORKDIR /srv
COPY bin bin
COPY certs certs
COPY containers containers
COPY defaults.env defaults.env
COPY lib lib
COPY logging.config.cjs .
COPY package.json .
COPY package-lock.json .
COPY public public
COPY routes routes
COPY test test
COPY views views
RUN npm ci -q
RUN npm run unit
