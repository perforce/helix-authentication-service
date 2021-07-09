#
# Docker container definition for publishing on Docker Hub.
#
# Build:
#
# $ docker build -t helix-auth-svc:latest -t helix-auth-svc:2021.1 -f containers/hub/Dockerfile .
# $ docker tag helix-auth-svc:latest perforce/helix-auth-svc:latest
# $ docker tag helix-auth-svc:2021.1 perforce/helix-auth-svc:2021.1
# $ docker push --all-tags perforce/helix-auth-svc
#
# Run:
#
# $ docker run -d -p 3000:3000 --name helix-auth-svc helix-auth-svc:latest
#
FROM node:14-slim AS builder
ENV DEBIAN_FRONTEND noninteractive
RUN apt-get -q update --fix-missing && \
    apt-get -q -y install git
RUN npm -g install pkg@5.3.0
WORKDIR /build
COPY bin bin
COPY lib lib
COPY package.json .
COPY package-lock.json .
COPY public public
COPY routes routes
COPY views views
RUN npm ci -q --only=prod --no-optional
RUN pkg . --target linux

#
# Build a minimal final image based on an image that has the libraries (stdc++,
# gcc) needed to run our compiled image (alpine is too minimal). Note that this
# base does not have curl, so we do not have a healthcheck.
#
FROM debian:buster-slim
WORKDIR /srv
COPY --from=builder /build/helix-auth-svc .
COPY certs certs
ENV DEBUG "yes"
ENV NODE_ENV development
ENV PORT 3000
ENV SVC_BASE_URI "https://localhost:3000"
EXPOSE ${PORT}
CMD ["./helix-auth-svc"]
