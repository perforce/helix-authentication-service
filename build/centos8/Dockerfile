FROM centos:8
#
# $ docker build -f build/centos8/Dockerfile --tag auth-svc:centos8 .
# $ docker run --rm --entrypoint find auth-svc:centos8 /root/rpmbuild/RPMS -name '*.rpm'
# $ docker run --rm --entrypoint cat auth-svc:centos8 /root/rpmbuild/RPMS/...rpm > package.rpm
#
# Should set ID_REL_BASE and ID_PATCH build args.
#

ARG ID_REL_BASE=2021.2.0
ARG ID_PATCH=9999999
ENV PKGNAME helix-auth-svc
ENV DIRNAME helix-auth-svc-${ID_REL_BASE}

#
# workaround CentOS 8 repositories going offline
#
RUN sed -i -e "s|mirrorlist=|#mirrorlist=|g" /etc/yum.repos.d/CentOS-*
RUN sed -i -e "s|#baseurl=http://mirror.centos.org|baseurl=http://vault.centos.org|g" /etc/yum.repos.d/CentOS-*

#
# install build and packaging prerequisites
#
RUN yum -q -y install curl gcc-c++ git make python2 rpm-build rpmdevtools
ADD https://rpm.nodesource.com/setup_16.x setup_16.x
RUN bash setup_16.x
# Skip gpg key check because it fails on some systems, and how that can happen
# in a docker container is beyond my comprehension.
RUN yum -q -y install --nogpgcheck -y nodejs

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
    bash -c 'cp /usr/share/doc/nodejs-*/LICENSE docs/licenses/nodejs'
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
