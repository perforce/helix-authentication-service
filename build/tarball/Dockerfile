FROM ubuntu:20.04
#
# $ docker build -f build/tarball/Dockerfile --tag auth-svc:tarball .
# $ docker run --rm --entrypoint cat auth-svc:tarball /build/helix-authentication-service.tgz > helix-authentication-service.tgz
#

ENV DEBIAN_FRONTEND noninteractive
ENV LC_ALL C.UTF-8
ENV LANG C.UTF-8

#
# install build prerequisites for admin interface
#
RUN apt-get update && \
    apt-get install -q -y build-essential curl debhelper devscripts git
ADD https://deb.nodesource.com/setup_18.x setup_18.x
RUN bash setup_18.x
RUN apt-get -q -y install nodejs

WORKDIR /build/helix-authentication-service

#
# produce a tarball for testing the install script
#
COPY bin bin
COPY certs certs
COPY client/.eslintrc.json client/.eslintrc.json
COPY client/index.html client/index.html
COPY client/package-lock.json client/package-lock.json
COPY client/package.json client/package.json
COPY client/public client/public
COPY client/README.md client/README.md
COPY client/src client/src
COPY client/vite.config.js client/vite.config.js
COPY docs docs
COPY lib lib
COPY public public
COPY routes routes
COPY views views
COPY CHANGELOG.md CHANGELOG.md
COPY CODE_OF_CONDUCT.md CODE_OF_CONDUCT.md
COPY defaults.env defaults.env
COPY example.env example.env
COPY install.sh install.sh
COPY LICENSE.txt LICENSE.txt
COPY logging.config.cjs logging.config.cjs
COPY sentinel.config.cjs sentinel.config.cjs
COPY package-lock.json package-lock.json
COPY package.json package.json
COPY README.md README.md
COPY RELNOTES.txt RELNOTES.txt

#
# build the admin interface static files
#
RUN cd client && npm -q i && npx vite build --outDir ../public/admin --emptyOutDir
RUN rm -rf client/node_modules

RUN cd .. && tar zcf helix-authentication-service.tgz helix-authentication-service
