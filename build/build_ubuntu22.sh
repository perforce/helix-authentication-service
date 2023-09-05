#!/bin/bash
#
# Build package tarball for Ubuntu 22.
#
set -e
echo 'creating tar file...'
rm -rf apt
mkdir -p apt/ubuntu/jammy/incoming
docker build -f build/ubuntu22/Dockerfile --output type=local,dest=apt/ubuntu/jammy/incoming .
tar zcf helix-auth-svc-ubuntu22.tgz apt
rm -rf apt
