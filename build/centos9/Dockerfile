FROM rockylinux:9 AS rocky9-build
#
# $ docker build -f build/centos9/Dockerfile --output type=local,dest=. .
#
# Should also set ID_REL_BASE and ID_PATCH using --build-arg option.
#
ARG NODE_VERSION=22

# Enable package documentation as we need the Node.js license file.
RUN sed -i '/nodocs/d' /etc/yum.conf

#
# install build and packaging prerequisites
#
ADD https://rpm.nodesource.com/setup_${NODE_VERSION}.x setup_${NODE_VERSION}.x
RUN bash setup_${NODE_VERSION}.x
RUN yum -y install nodejs
RUN yum -q -y install rpmdevtools rpm-build gcc-c++ git make

ARG ID_REL_BASE=2025.1.0
ARG ID_PATCH=9999999
ENV PKGNAME=helix-auth-svc
ENV DIRNAME=helix-auth-svc-${ID_REL_BASE}

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
COPY package.json package.json
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
    bash -c 'cp /usr/share/doc/nodejs-*/LICENSE docs/licenses/nodejs'
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

#
# build the rpm package
#
ENV ID_REL_BASE=${ID_REL_BASE}
ENV ID_PATCH=${ID_PATCH}
RUN rpmdev-setuptree
RUN tar -C .. -z -c -f /root/rpmbuild/SOURCES/${PKGNAME}.tar.gz ${DIRNAME}
COPY build/rpm /root/rpmbuild/SPECS
RUN rpmbuild -bb /root/rpmbuild/SPECS/helix-auth-svc.spec

#
# Produce an image that contains only the build artifact, allowing for the use
# of the --output option to the `docker build` command.
#
FROM scratch AS rocky9-export
ARG ID_REL_BASE=2025.1.0
ARG ID_PATCH=9999999
ENV PKGNAME=helix-auth-svc
ENV PACKAGE_FILENAME=${PKGNAME}-${ID_REL_BASE}-${ID_PATCH}.x86_64.rpm
COPY --from=rocky9-build /root/rpmbuild/RPMS/x86_64/${PACKAGE_FILENAME} ${PACKAGE_FILENAME}
