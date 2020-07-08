FROM centos:8
#
# $ docker build -f test/packages/CentOS8.dockerfile -t has-centos8-test .
# $ docker image ls | grep has-centos8-test
#

# The docker base images are generally minimal, and our package and its
# post-install script have certain requirements, so install those now.
RUN yum -q -y install sudo

# install node.js via package from nodesource
ADD https://rpm.nodesource.com/setup_12.x setup_12.x
RUN bash setup_12.x
RUN yum -y install nodejs
RUN test -f /usr/bin/node

# install our package using the tarball from the previous build stage
COPY helix-auth-svc-centos8.tgz .
RUN tar zxf helix-auth-svc-centos8.tgz
RUN yum -y install ./yum/rhel/8/x86_64/helix-auth-svc-*.rpm

# ensure the package is fully installed
RUN rpm -qa helix-auth-svc | grep -q helix-auth-svc

# ensure the package.json has the expected version string
RUN grep -qE 'HAS/noarch/20..\../.+' /opt/perforce/helix-auth-svc/package.json

# ensure certain files are present
RUN test -f /opt/perforce/helix-auth-svc/README.html

# ensure pm2 is installed as expected
RUN test -f /usr/bin/pm2
