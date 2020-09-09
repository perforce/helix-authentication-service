FROM centos:7
#
# $ docker build -f test/packages/CentOS7.dockerfile -t has-centos7-test .
# $ docker image ls | grep has-centos7-test
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
COPY helix-auth-svc-centos7.tgz .
RUN tar zxf helix-auth-svc-centos7.tgz
RUN yum -y install ./yum/rhel/7/x86_64/helix-auth-svc-*.rpm

# ensure the package is fully installed
RUN rpm -qa helix-auth-svc | grep -q helix-auth-svc

# ensure the package.json has the expected version string
RUN grep -qE 'HAS/noarch/20..\../.+' /opt/perforce/helix-auth-svc/package.json

# ensure certain files are present
RUN test -f /opt/perforce/helix-auth-svc/README.html
RUN test -x /opt/perforce/helix-auth-svc/bin/configure-auth-service.sh
RUN test -f /opt/perforce/helix-auth-svc/bin/writeconf.js
RUN test -x /opt/perforce/helix-auth-svc/bin/www

# ensure pm2 is installed as expected
RUN test -f /usr/bin/pm2

# finally remove the package to make sure that does not fail horribly
RUN yum -y erase helix-auth-svc
