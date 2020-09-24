FROM centos:7
#
# $ docker build -f build/centos7/Dockerfile --tag auth-svc:centos7 .
# $ docker run --rm --entrypoint find auth-svc:centos7 /root/rpmbuild/RPMS -name *.rpm
# $ docker run --rm --entrypoint cat auth-svc:centos7 /root/rpmbuild/RPMS/...rpm > package.rpm
#
# Should set ID_REL_BASE and ID_PATCH build args.
#

ARG ID_REL_BASE=2020.1.0
ARG ID_PATCH=9999999
ENV PKGNAME helix-auth-svc
ENV DIRNAME helix-auth-svc-${ID_REL_BASE}

#
# install build and packaging prerequisites
#
RUN yum -q -y install curl gcc-c++ git make rpm-build rpmdevtools
ADD https://rpm.nodesource.com/setup_12.x setup_12.x
RUN bash setup_12.x
RUN yum -q -y install nodejs

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
COPY package.json package.json
COPY README.md README.md

#
# produce an HTML version of the Markdown README file
#
RUN npm -q ci
RUN npx showdown makehtml -i README.md -o README.html --tables --completeHTMLDocument
RUN rm -rf node_modules

#
# build only what is needed for deployment
#
RUN npm ci -q --only=production

#
# build the rpm package
#
ENV ID_REL_BASE ${ID_REL_BASE}
ENV ID_PATCH ${ID_PATCH}
RUN rpmdev-setuptree
RUN tar -C .. -z -c -f /root/rpmbuild/SOURCES/${PKGNAME}.tar.gz ${DIRNAME}
COPY build/rpm /root/rpmbuild/SPECS
RUN rpmbuild -bb /root/rpmbuild/SPECS/helix-auth-svc.spec
