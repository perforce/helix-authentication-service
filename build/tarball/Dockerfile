FROM ubuntu:20.04
#
# $ docker build -f build/tarball/Dockerfile --tag auth-svc:tarball .
# $ docker run --rm --entrypoint cat auth-svc:tarball /build/helix-authentication-service.tgz > helix-authentication-service.tgz
#

ENV DEBIAN_FRONTEND noninteractive

WORKDIR /build/helix-authentication-service

#
# produce a tarball for testing the install script
#
COPY bin bin
COPY certs certs
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

RUN cd .. && tar zcf helix-authentication-service.tgz helix-authentication-service
