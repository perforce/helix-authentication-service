#!/bin/bash
#
# Build package tarball for CentOS 7.
#
set -e
echo 'creating tar file...'
rm -rf yum
mkdir -p yum/rhel/7/x86_64
docker build -f build/centos7/Dockerfile --output type=local,dest=yum/rhel/7/x86_64 .
tar zcf helix-auth-svc-centos7.tgz yum
rm -rf yum
