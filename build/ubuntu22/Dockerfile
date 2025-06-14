FROM ubuntu:22.04 AS ubuntu22_pkg_base
#
# $ docker build -f build/ubuntu22/Dockerfile --output type=local,dest=. .
#
# Should also set ID_REL_BASE and ID_PATCH using --build-arg option.
#
ARG NODE_VERSION=22
ENV DEBIAN_FRONTEND=noninteractive
ENV LC_ALL=C.UTF-8
ENV LANG=C.UTF-8

# Enable package documentation as we need the Node.js license file.
RUN sed -i '/path-exclude=\/usr\/share\/doc\/*/d' /etc/dpkg/dpkg.cfg.d/excludes

#
# install build and packaging prerequisites
#
RUN apt-get -q update && \
    apt-get -q -y install ca-certificates build-essential curl debhelper devscripts git gnupg
RUN mkdir -p /etc/apt/keyrings
ADD https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key nodesource-repo.gpg.key
RUN gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg nodesource-repo.gpg.key
RUN echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_VERSION}.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
RUN apt-get -q update
RUN apt-get -q -y install nodejs

FROM ubuntu22_pkg_base AS ubuntu22-build

ARG ID_REL_BASE=2025.1.0
ARG ID_PATCH=9999999
ENV HAS_VERSION="HAS/noarch/${ID_REL_BASE}/${ID_PATCH}"
ENV DIRNAME=helix-auth-svc-${ID_REL_BASE}
ENV PKGNAME=helix-auth-svc_${ID_REL_BASE}
ENV PACKAGE_FILENAME=${PKGNAME}-${ID_PATCH}~jammy_amd64.deb
ENV DEBEMAIL='support+packaging@perforce.com'
ENV DEBFULLNAME='Perforce Software, Inc.'

WORKDIR /build/${DIRNAME}

#
# copy over only what is needed for the package
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
COPY defaults.env defaults.env
COPY example.env example.env
COPY example.toml example.toml
COPY LICENSE.txt LICENSE.txt
COPY logging.config.cjs logging.config.cjs
COPY sentinel.config.cjs sentinel.config.cjs
COPY package-lock.json package-lock.json
COPY package.json package.json.in
RUN sed -e "s/\"2025.1\"/\"${ID_REL_BASE}-${ID_PATCH}\"/" \
        -e "s|+MAIN+|${HAS_VERSION}|" package.json.in > package.json && \
    rm -f package.json.in
COPY README.md README.md
COPY RELNOTES.txt RELNOTES.txt

#
# produce an HTML version of the Markdown README file and generate the set of
# third party licenses into the docs directory
#
RUN npm -q ci
RUN npx showdown makehtml -i README.md -o README.html -c tables -c completeHTMLDocument
RUN node ./bin/copyLicenses.js
RUN mkdir -p docs/licenses/nodejs && \
    cp /usr/share/doc/nodejs/LICENSE docs/licenses/nodejs
RUN rm -rf node_modules

#
# build the admin interface static files
#
RUN cd client && npm -q ci && npx vite build --outDir ../private/admin --emptyOutDir

#
# build only what is needed for deployment
#
RUN npm -q ci --omit=dev
RUN cp /usr/bin/node ./bin
RUN tar zcf ../${PKGNAME}.orig.tar.gz .

#
# build the debian package
#
COPY build/debian debian
RUN sed -e "s/ID_REL_BASE_REPLACE/${ID_REL_BASE}/" \
        -e "s/ID_PATCH_REPLACE/${ID_PATCH}~jammy/" \
        -e "s/DATE_STRING_REPLACE/`date +'%a, %d %b %Y %H:%M:%S %z'`/" \
        debian/changelog.in > debian/changelog
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

#
# Produce an image that contains only the build artifact, allowing for the use
# of the --output option to the `docker build` command.
#
FROM scratch AS ubuntu22-export
ARG ID_REL_BASE=2025.1.0
ARG ID_PATCH=9999999
ENV PKGNAME=helix-auth-svc_${ID_REL_BASE}
ENV PACKAGE_FILENAME=${PKGNAME}-${ID_PATCH}~jammy_amd64.deb
COPY --from=ubuntu22-build /build/${PACKAGE_FILENAME} ${PACKAGE_FILENAME}
