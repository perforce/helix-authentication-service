#!/bin/bash
#
# Build package tarball for CentOS 8.
#
set -e
docker build -f build/centos8/Dockerfile --tag auth-svc:centos8 .
echo 'creating tar file...'
rm -rf yum
mkdir -p yum/rhel/8/x86_64
RPMPATH=$(docker run --rm --entrypoint find auth-svc:centos8 /root/rpmbuild/RPMS -name '*.rpm')
docker run --rm --entrypoint cat auth-svc:centos8 ${RPMPATH} > yum/rhel/8/x86_64/helix-auth-svc-snapshot.rpm
tar zcf helix-auth-svc-centos8.tgz yum
rm -rf yum
