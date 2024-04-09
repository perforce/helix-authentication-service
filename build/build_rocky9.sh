#!/bin/bash
#
# Build package tarball for RHEL 9 using a compatible OS.
#
set -e
echo 'creating tar file...'
rm -rf yum
mkdir -p yum/rhel/9/x86_64
docker build -f build/centos9/Dockerfile --output type=local,dest=yum/rhel/9/x86_64 .
tar zcf helix-auth-svc-centos9.tgz yum
rm -rf yum
