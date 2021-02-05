#!/bin/bash
#
# Build package tarball for Ubuntu 16.
#
set -e
docker build -f build/ubuntu16/Dockerfile --tag auth-svc:ubuntu16 .
echo 'creating tar file...'
rm -rf apt
mkdir -p apt/ubuntu/xenial/incoming
DEBPATH=$(docker run --rm --entrypoint find auth-svc:ubuntu16 /build -name '*.deb')
docker run --rm --entrypoint cat auth-svc:ubuntu16 ${DEBPATH} > apt/ubuntu/xenial/incoming/helix-auth-svc_snapshot.deb
tar zcf helix-auth-svc-ubuntu16.tgz apt
rm -rf apt
