#!/bin/bash
#
# Build package tarball for Ubuntu 22.
#
set -e
docker build -f build/ubuntu22/Dockerfile --tag auth-svc:ubuntu22 .
echo 'creating tar file...'
rm -rf apt
mkdir -p apt/ubuntu/jammy/incoming
DEBPATH=$(docker run --rm --entrypoint find auth-svc:ubuntu22 /build -name '*.deb')
docker run --rm --entrypoint cat auth-svc:ubuntu22 ${DEBPATH} > apt/ubuntu/jammy/incoming/helix-auth-svc_snapshot.deb
tar zcf helix-auth-svc-ubuntu22.tgz apt
rm -rf apt
