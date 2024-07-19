#
# Docker container definition for publishing on Docker Hub.
#
# Build:
#
# $ docker build --pull -t helix-auth-svc:latest -t helix-auth-svc:2024.2 -f containers/hub/Dockerfile .
# $ docker tag helix-auth-svc:latest perforce/helix-auth-svc:latest
# $ docker tag helix-auth-svc:2024.2 perforce/helix-auth-svc:2024.2
# $ docker push --all-tags perforce/helix-auth-svc
#
# Run:
#
# $ docker run -d -p 3000:3000 --name helix-auth-svc helix-auth-svc:latest
#

#
# get the p4 client via package to support SCIM
#
FROM ubuntu:20.04 AS p4cli
ARG APT_URL="http://package.perforce.com/apt/ubuntu"
ARG PUB_KEY="http://package.perforce.com/perforce.pubkey"
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && \
    apt-get -q -y install apt-utils lsb-release gnupg
ADD ${PUB_KEY} perforce.pubkey
RUN apt-key add perforce.pubkey && \
    rm -f perforce.pubkey
RUN echo "deb ${APT_URL} $(lsb_release -sc) release" > /etc/apt/sources.list.d/perforce.sources.list
RUN apt-get update && \
    apt-get -q -y install helix-cli

#
# build the web-based admin interface
#
FROM node:20-slim AS webui
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get -q update --fix-missing && \
    apt-get -q -y install curl git
WORKDIR /build
COPY client .
RUN npm -q ci
RUN npx vite build --outDir private/admin --emptyOutDir

#
# build the smallest feasible image for the service
#
FROM node:20-slim
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get -q update --fix-missing && \
    apt-get -q -y install curl git
WORKDIR /srv
COPY bin bin
COPY certs certs
COPY defaults.env defaults.env
COPY lib lib
COPY package.json .
COPY package-lock.json .
COPY --from=webui /build/private private
COPY public public
COPY routes routes
COPY views views
# Use npm ci for a predictable install. Only install the production dependencies
# to save space. Avoid the optional dependencies, especially unix-dgram which
# requires node-gyp, which in turn requires Python, which would make this image
# much larger (note unix-dgram is only needed by winston-syslog).
RUN npm ci -q --only=prod --omit=optional

# SCIM support requires a p4 client binary to be present
COPY --from=p4cli /opt/perforce/bin/p4 /usr/bin/p4

ENV CA_CERT_FILE=certs/ca.crt
ENV DEBUG="yes"
ENV NODE_ENV=development
ENV PORT=3000
ENV PROTOCOL=http
EXPOSE ${PORT}
HEALTHCHECK CMD curl --insecure --fail --silent --head ${PROTOCOL}://localhost:${PORT}/ || exit 1

ENTRYPOINT [ "node", "bin/www" ]
