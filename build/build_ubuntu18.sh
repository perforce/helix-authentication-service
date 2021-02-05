#!/bin/bash
#
# Build package tarball for Ubuntu 18.
#
set -e
docker build -f build/ubuntu18/Dockerfile --tag auth-svc:ubuntu18 .
echo 'creating tar file...'
rm -rf apt
mkdir -p apt/ubuntu/bionic/incoming
DEBPATH=$(docker run --rm --entrypoint find auth-svc:ubuntu18 /build -name '*.deb')
docker run --rm --entrypoint cat auth-svc:ubuntu18 ${DEBPATH} > apt/ubuntu/bionic/incoming/helix-auth-svc_snapshot.deb
tar zcf helix-auth-svc-ubuntu18.tgz apt
rm -rf apt
