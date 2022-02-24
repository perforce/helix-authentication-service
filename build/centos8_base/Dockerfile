FROM centos:8
#
# Run the following commands to produce a stable image from which to build
# everything that depends on CentOS 8. This is necessary as CentOS 8 has been
# retired in a manner that makes reliable builds very difficult.
#
# $ docker build -f build/centos8_base/Dockerfile --tag has-build:centos8 .
# $ docker save -o has-build-centos8.tar has-build:centos8
#
# Copy the tar file to the build host(s), then on the build host(s):
#
# $ docker load -i has-build-centos8.tar
#

#
# workaround CentOS 8 repositories going offline
#
RUN sed -i -e "s|mirrorlist=|#mirrorlist=|g" /etc/yum.repos.d/CentOS-*
RUN sed -i -e "s|#baseurl=http://mirror.centos.org|baseurl=http://vault.centos.org|g" /etc/yum.repos.d/CentOS-*

#
# install superset of all build and packaging prerequisites
#
RUN yum -q -y install curl gcc-c++ git grep iputils make patch \
        python2 python3 rpm-build rpmdevtools sudo systemd which
RUN dnf -q -y install 'dnf-command(download)'
