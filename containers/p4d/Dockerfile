FROM ubuntu:18.04

ARG PUB_KEY
ARG APT_URL
ARG P4PORT

WORKDIR /p4auth

ENV DEBIAN_FRONTEND noninteractive

#
# Install p4 and p4d using packages.
#
RUN apt-get update
RUN apt-get -q -y install apt-utils lsb-release gnupg
ADD ${PUB_KEY} perforce.pubkey
RUN apt-key add perforce.pubkey
RUN rm -f perforce.pubkey
RUN echo "deb ${APT_URL} $(lsb_release -sc) release" > /etc/apt/sources.list.d/perforce.sources.list
RUN apt-get update
RUN apt-get -q -y install helix-cli helix-p4d

RUN /opt/perforce/sbin/configure-helix-p4d.sh -n -p ${P4PORT} -u super -P Rebar123 despot

EXPOSE 1666

HEALTHCHECK CMD p4 -p 0.0.0.0:1666 -u super info || exit 1

USER perforce

#
# perform the initial setup of the p4d instance
#
COPY ./build.sh .
COPY ./user_jackson.txt .
COPY ./user_johndoe.txt .
COPY ./group_notimeout.txt .
RUN ./build.sh

COPY ./run.sh .
ENTRYPOINT [ "./run.sh" ]
