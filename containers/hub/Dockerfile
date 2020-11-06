#
# Docker container definition for publishing on Docker Hub.
#
# $ docker build -t helix-auth-svc:latest -f containers/hub/Dockerfile .
# $ docker run -d -p 3000:3000 --name helix-auth-svc helix-auth-svc:latest
# $ docker tag helix-auth-svc:latest p4nathan/helix-auth-svc
# $ docker push p4nathan/helix-auth-svc
#
FROM node:14-slim

ENV DEBIAN_FRONTEND noninteractive
RUN apt-get -q update && \
    apt-get -q -y install git

WORKDIR /helix-auth-svc
COPY bin bin
COPY certs certs
COPY lib lib
COPY package.json .
COPY package-lock.json .
COPY public public
COPY routes routes
COPY views views
RUN npm ci -q --only=prod --no-optional

ENV DEBUG "yes"
ENV NODE_ENV development
ENV PORT 3000
ENV SVC_BASE_URI "https://localhost:3000"

EXPOSE ${PORT}

HEALTHCHECK CMD curl -k -f -s -I http://localhost:${PORT}/ || exit 1

ENTRYPOINT [ "node", "-r", "module-alias/register", "bin/www" ]
