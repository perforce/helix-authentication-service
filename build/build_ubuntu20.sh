#!/bin/bash
#
# Build package tarball for Ubuntu 20.
#
set -e
echo 'creating tar file...'
rm -rf apt
mkdir -p apt/ubuntu/focal/incoming
docker build -f build/ubuntu20/Dockerfile --output type=local,dest=apt/ubuntu/focal/incoming .
tar zcf helix-auth-svc-ubuntu20.tgz apt
rm -rf apt
