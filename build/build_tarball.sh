#!/bin/bash
#
# Build the tarball for testing install script.
#
set -e
docker build -f build/tarball/Dockerfile --tag auth-svc:tarball .
echo 'creating tar file...'
docker run --rm --entrypoint cat auth-svc:tarball /build/helix-authentication-service.tgz > helix-authentication-service.tgz
