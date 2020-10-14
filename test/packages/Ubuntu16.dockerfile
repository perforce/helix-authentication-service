FROM ubuntu:16.04
#
# $ docker build -f test/packages/Ubuntu16.dockerfile -t has-ubuntu16-test .
# $ docker image ls | grep has-ubuntu16-test
#

# At some point this docker image changed and lost the USER envar.
ENV USER=root

# The docker base images are generally minimal, and our package and its
# post-install script have certain requirements, so install those now.
RUN apt-get -q update
RUN apt-get -q -y install sudo

# install node.js via package from nodesource
ADD https://deb.nodesource.com/setup_12.x setup_12.x
RUN bash setup_12.x
RUN apt-get -q -y install nodejs
RUN test -f /usr/bin/node

# install our package using the tarball from the previous build stage
COPY helix-auth-svc-ubuntu16.tgz .
RUN tar zxf helix-auth-svc-ubuntu16.tgz
RUN apt install ./apt/ubuntu/xenial/incoming/helix-auth-svc_*.deb

# ensure the package is fully installed
RUN dpkg-query -s helix-auth-svc | grep -q 'install ok installed'

# ensure the package.json has the expected version string
RUN grep -qE 'HAS/noarch/20..\..+?/.+' /opt/perforce/helix-auth-svc/package.json

# ensure certain files are present
RUN test -f /opt/perforce/helix-auth-svc/README.html
RUN test -x /opt/perforce/helix-auth-svc/bin/configure-auth-service.sh
RUN test -f /opt/perforce/helix-auth-svc/bin/writeconf.js
RUN test -x /opt/perforce/helix-auth-svc/bin/www

# ensure pm2 is installed as expected
RUN test -f /usr/bin/pm2
RUN test -f /etc/systemd/system/pm2-root.service

# finally remove the package to make sure that does not fail horribly
RUN apt-get -q -y remove helix-auth-svc
