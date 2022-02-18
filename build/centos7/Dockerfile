FROM centos:7 AS centos7_pkg_base
#
# $ docker build -f build/centos7/Dockerfile --tag auth-svc:centos7 .
# $ docker run --rm --entrypoint find auth-svc:centos7 /root/rpmbuild/RPMS -name '*.rpm'
# $ docker run --rm --entrypoint cat auth-svc:centos7 /root/rpmbuild/RPMS/...rpm > package.rpm
#
# Should set ID_REL_BASE and ID_PATCH build args.
#

# Enable package documentation as we need the Node.js license file.
RUN sed -i '/nodocs/d' /etc/yum.conf

#
# install build and packaging prerequisites
#
RUN yum -q -y install curl gcc-c++ git make rpm-build rpmdevtools
ADD https://rpm.nodesource.com/setup_16.x setup_16.x
RUN bash setup_16.x
RUN yum -q -y install nodejs

#
# Build the package using the stable base image to reduce intermittent build
# failures caused by temporary network outages.
#
FROM centos7_pkg_base

ARG ID_REL_BASE=2021.2.0
ARG ID_PATCH=9999999
ENV PKGNAME helix-auth-svc
ENV DIRNAME helix-auth-svc-${ID_REL_BASE}

# Disable the interesting feature of the CentOS docker image whereby they
# quietly prevent all documentation from being installed via packages.
RUN sed -i '/nodocs/d' /etc/yum.conf

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
RUN npx showdown makehtml -i README.md -o README.html --tables --completeHTMLDocument
RUN node ./bin/copyLicenses.js
RUN mkdir -p docs/licenses/nodejs && \
    cp /usr/share/doc/nodejs-*/LICENSE docs/licenses/nodejs
RUN rm -rf node_modules

#
# build only what is needed for deployment
#
RUN npm ci -q --only=production --no-optional
RUN cp /usr/bin/node ./bin

#
# build the rpm package
#
ENV ID_REL_BASE ${ID_REL_BASE}
ENV ID_PATCH ${ID_PATCH}
RUN rpmdev-setuptree
RUN tar -C .. -z -c -f /root/rpmbuild/SOURCES/${PKGNAME}.tar.gz ${DIRNAME}
COPY build/rpm /root/rpmbuild/SPECS
RUN rpmbuild -bb /root/rpmbuild/SPECS/helix-auth-svc.spec
