#!/bin/bash
#
# Build package tarball for Ubuntu 20.
#
set -e
docker build -f build/ubuntu20/Dockerfile --tag auth-svc:ubuntu20 .
echo 'creating tar file...'
rm -rf apt
mkdir -p apt/ubuntu/focal/incoming
DEBPATH=$(docker run --rm --entrypoint find auth-svc:ubuntu20 /build -name '*.deb')
docker run --rm --entrypoint cat auth-svc:ubuntu20 ${DEBPATH} > apt/ubuntu/focal/incoming/helix-auth-svc_snapshot.deb
tar zcf helix-auth-svc-ubuntu20.tgz apt
rm -rf apt
