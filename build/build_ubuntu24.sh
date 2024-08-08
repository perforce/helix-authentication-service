#!/bin/bash
#
# Build package tarball for Ubuntu 24.
#
set -e
echo 'creating tar file...'
rm -rf apt
mkdir -p apt/ubuntu/noble/incoming
docker build -f build/ubuntu24/Dockerfile --output type=local,dest=apt/ubuntu/noble/incoming .
tar zcf helix-auth-svc-ubuntu24.tgz apt
rm -rf apt
