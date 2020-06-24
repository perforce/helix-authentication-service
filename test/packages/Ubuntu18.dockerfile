FROM ubuntu:18.04
#
# $ docker build -f test/packages/Ubuntu18.dockerfile -t has-ubuntu18-test .
# $ docker image ls | grep has-ubuntu18-test
#

# The docker base images are generally minimal, and our package and its
# post-install script have certain requirements, so install those now.
RUN apt-get -q update
RUN apt-get -q -y install sudo systemd

# install node.js via package from nodesource
ADD https://deb.nodesource.com/setup_12.x setup_12.x
RUN bash setup_12.x
RUN apt-get -q -y install nodejs
RUN test -f /usr/bin/node

# install our package using the tarball from the previous build stage
COPY helix-auth-svc-ubuntu18.tgz .
RUN tar zxf helix-auth-svc-ubuntu18.tgz
RUN apt install ./apt/ubuntu/bionic/incoming/helix-auth-svc_*.deb

# ensure the package is fully installed
RUN dpkg-query -s helix-auth-svc | grep -q 'install ok installed'

# ensure pm2 is installed as expected
RUN test -f /usr/bin/pm2
