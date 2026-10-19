#!/bin/bash
#
# Build package tarball for Ubuntu 26.
#
set -e
echo 'creating tar file...'
rm -rf apt
mkdir -p apt/ubuntu/resolute/incoming
docker build -f build/ubuntu26/Dockerfile --output type=local,dest=apt/ubuntu/resolute/incoming .
tar zcf helix-auth-svc-ubuntu26.tgz apt
rm -rf apt
