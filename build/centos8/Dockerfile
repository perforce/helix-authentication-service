FROM has-build:centos8
#
# $ docker build -f build/centos8/Dockerfile --tag auth-svc:centos8 .
# $ docker run --rm --entrypoint find auth-svc:centos8 /root/rpmbuild/RPMS -name '*.rpm'
# $ docker run --rm --entrypoint cat auth-svc:centos8 /root/rpmbuild/RPMS/...rpm > package.rpm
#
# Should set ID_REL_BASE and ID_PATCH build args.
#

# Enable package documentation as we need the Node.js license file.
RUN sed -i '/nodocs/d' /etc/yum.conf

ADD https://rpm.nodesource.com/setup_18.x setup_18.x
RUN bash setup_18.x
# Skip gpg key check because it fails on some systems, and how that can happen
# in a docker container is beyond my comprehension.
RUN yum -q -y install --nogpgcheck -y nodejs

# Install packages for building packages.
# (base image has rpmdevtools, rpm-build already)
# RUN yum -q -y install rpmdevtools rpm-build

ARG ID_REL_BASE=2023.1.0
ARG ID_PATCH=9999999
ENV PKGNAME helix-auth-svc
ENV DIRNAME helix-auth-svc-${ID_REL_BASE}

WORKDIR /build/${DIRNAME}

#
# copy over only what is needed for the package
#
COPY bin bin
COPY certs certs
COPY client/jsconfig.json client/jsconfig.json
COPY client/package-lock.json client/package-lock.json
COPY client/package.json client/package.json
COPY client/public client/public
COPY client/README.md client/README.md
COPY client/src client/src
COPY docs docs
COPY lib lib
COPY public public
COPY routes routes
COPY views views
COPY defaults.env defaults.env
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
RUN npx showdown makehtml -i README.md -o README.html -c tables -c completeHTMLDocument
RUN node ./bin/copyLicenses.js
RUN mkdir -p docs/licenses/nodejs && \
    bash -c 'cp /usr/share/doc/nodejs-*/LICENSE docs/licenses/nodejs'
RUN rm -rf node_modules

#
# build the admin interface static files
#
RUN cd client && npm -q ci && BUILD_PATH=../public/admin npm run build

#
# build only what is needed for deployment
#
RUN npm -q ci --omit=dev
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
