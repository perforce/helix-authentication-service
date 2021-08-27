FROM ubuntu:18.04
#
# $ docker build -f build/ubuntu18/Dockerfile --tag auth-svc:ubuntu18 .
# $ docker run --rm --entrypoint find auth-svc:ubuntu18 /build -name '*.deb'
# $ docker run --rm --entrypoint cat auth-svc:ubuntu18 /build/...deb > package.deb
#
# Should set ID_REL_BASE and ID_PATCH build args.
#

ARG ID_REL_BASE=2021.2.0
ARG ID_PATCH=9999999
ENV HAS_VERSION "HAS/noarch/${ID_REL_BASE}/${ID_PATCH}"
ENV DIRNAME helix-auth-svc-${ID_REL_BASE}
ENV PKGNAME helix-auth-svc_${ID_REL_BASE}
ENV PACKAGE_FILENAME ${PKGNAME}-${ID_PATCH}~bionic_amd64.deb
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
ADD https://deb.nodesource.com/setup_14.x setup_14.x
RUN bash setup_14.x
RUN apt-get -q -y install nodejs
RUN npm -g install pkg@5.3.0

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
COPY example.env example.env
COPY logging.config.js logging.config.js
COPY package-lock.json package-lock.json
COPY package.json package.json.in
RUN sed -e "s/\"2021.2.0\"/\"${ID_REL_BASE}-${ID_PATCH}\"/" \
        -e "s|+MAIN+|${HAS_VERSION}|" package.json.in > package.json && \
    rm -f package.json.in
COPY README.md README.md
COPY RELNOTES.txt RELNOTES.txt

#
# produce an HTML version of the Markdown README file and generate the set of
# third party licenses into the docs directory
#
RUN npm -q ci
RUN npx showdown makehtml -i README.md -o README.html --tables --completeHTMLDocument
RUN node ./bin/copyLicenses.js
RUN rm -rf node_modules

#
# build only what is needed for packaging
#
RUN npm ci -q --only=production --no-optional
RUN pkg . --targets=linux
RUN rm -rf node_modules
RUN tar zcf ../${PKGNAME}.orig.tar.gz .

#
# build the debian package
#
COPY build/debian debian
RUN sed -e "s/ID_REL_BASE_REPLACE/${ID_REL_BASE}/" \
        -e "s/ID_PATCH_REPLACE/${ID_PATCH}~bionic/" \
        -e "s/DATE_STRING_REPLACE/`date +'%a, %d %b %Y %H:%M:%S %z'`/" \
        debian/changelog.in > debian/changelog
# prevent dh_strip from stripping our executable and thoroughly breaking it
# (resulting executable would emit 'Pkg: Error reading from file.' and die)
ENV DEB_BUILD_OPTIONS nostrip
RUN dpkg-buildpackage -b -rfakeroot -us -uc -ui
#
# Work around issue with older aptly that does not recognize the new default
# compression format (xz) by rebuilding the package using gzip compression.
# Would prefer to get this from dpkg-buildpackage but that seems impossible.
#
RUN dpkg-deb -R ../${PACKAGE_FILENAME} tmp
RUN rm ../${PACKAGE_FILENAME}
RUN fakeroot dpkg-deb -Zgzip --build tmp ../${PACKAGE_FILENAME}
RUN rm -rf tmp
