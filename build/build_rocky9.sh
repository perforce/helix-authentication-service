#!/bin/bash
#
# Build package tarball for CentOS Stream 9 (using RockyLinux 9).
#
set -e
echo 'creating tar file...'
rm -rf yum
mkdir -p yum/rhel/9/x86_64
docker build -f build/rocky9/Dockerfile --output type=local,dest=yum/rhel/9/x86_64 .
tar zcf helix-auth-svc-centos9.tgz yum
rm -rf yum
