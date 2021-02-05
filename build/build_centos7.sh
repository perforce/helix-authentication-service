#!/bin/bash
#
# Build package tarball for CentOS 7.
#
set -e
docker build -f build/centos7/Dockerfile --tag auth-svc:centos7 .
echo 'creating tar file...'
rm -rf yum
mkdir -p yum/rhel/7/x86_64
RPMPATH=$(docker run --rm --entrypoint find auth-svc:centos7 /root/rpmbuild/RPMS -name '*.rpm')
docker run --rm --entrypoint cat auth-svc:centos7 ${RPMPATH} > yum/rhel/7/x86_64/helix-auth-svc-snapshot.rpm
tar zcf helix-auth-svc-centos7.tgz yum
rm -rf yum
