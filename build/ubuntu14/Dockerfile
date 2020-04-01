FROM ubuntu:14.04
#
# $ docker build -f build/ubuntu14/Dockerfile --tag auth-svc:ubuntu14 .
# $ docker run --rm --entrypoint cat auth-svc:ubuntu14 /build/*.deb > package.deb
#
# Should set ID_REL_BASE and ID_PATCH build args.
#

ARG ID_REL_BASE=2020.1.9999999
ARG ID_PATCH=1
ENV DIRNAME helix-auth-svc-${ID_REL_BASE}
ENV PKGNAME helix-auth-svc_${ID_REL_BASE}
ENV DEBEMAIL 'support+packaging@perforce.com'
ENV DEBFULLNAME 'Perforce Software, Inc.'
ENV DEBIAN_FRONTEND noninteractive
ENV LC_ALL C.UTF-8
ENV LANG C.UTF-8

#
# install build and packaging prerequisites
#
RUN apt-get update && \
    apt-get install -q -y build-essential curl debhelper devscripts git
ADD https://deb.nodesource.com/setup_12.x setup_12.x
RUN bash setup_12.x
RUN apt-get -q -y install nodejs

WORKDIR /build/${DIRNAME}

#
# copy over only what is needed for the package
#
COPY bin bin
COPY certs certs
COPY docs docs
COPY lib lib
COPY public public
COPY routes routes
COPY views views
COPY ecosystem.config.js ecosystem.config.js
COPY logging.config.js logging.config.js
COPY package-lock.json package-lock.json
COPY package.json package.json.in
RUN sed -e "s/\"2020.1.9999999\"/\"${ID_REL_BASE}\"/" package.json.in > package.json && \
    rm -f package.json.in
COPY README.md README.md

#
# build only what is needed for deployment
#
RUN npm ci -q --only=production
RUN tar zcf ../${PKGNAME}.orig.tar.gz .

#
# build the debian package
#
COPY build/debian debian
RUN sed -e "s/ID_REL_BASE_REPLACE/${ID_REL_BASE}/" \
        -e "s/ID_PATCH_REPLACE/${ID_PATCH}~trusty/" \
        -e "s/DATE_STRING_REPLACE/`date +'%a, %d %b %Y %H:%M:%S %z'`/" \
		debian/changelog.in > debian/changelog
RUN dpkg-buildpackage -b -rfakeroot -us -uc
