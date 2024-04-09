#!/bin/bash
#
# Build package tarball for RHEL 8 using a compatible OS.
#
set -e
echo 'creating tar file...'
rm -rf yum
mkdir -p yum/rhel/8/x86_64
docker build -f build/centos8/Dockerfile --output type=local,dest=yum/rhel/8/x86_64 .
tar zcf helix-auth-svc-centos8.tgz yum
rm -rf yum
