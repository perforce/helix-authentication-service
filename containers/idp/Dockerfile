FROM node:10

ARG SVC_SCHEME

ENV DEBIAN_FRONTEND noninteractive

RUN apt-get update
RUN apt-get -q -y install git
RUN git clone --depth 1 -q https://github.com/mcguinness/saml-idp.git
WORKDIR saml-idp
RUN rm -f package-lock.json && npm install -q

EXPOSE 7000

HEALTHCHECK CMD curl -f -s -o /dev/null http://localhost:7000/ || exit 1

ENTRYPOINT node app.js --acs ${SVC_SCHEME}://svc.doc:3000/saml/sso --slo ${SVC_SCHEME}://svc.doc:3000/saml/slo --aud urn:example:sp
