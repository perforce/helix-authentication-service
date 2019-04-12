FROM node:lts-stretch

ARG SVC_PROTOCOL

ENV DEBIAN_FRONTEND noninteractive

RUN apt-get update
RUN apt-get -q -y install git
RUN git clone --depth 1 -q https://github.com/mcguinness/saml-idp.git
WORKDIR saml-idp
RUN rm -f package-lock.json && npm install -q

EXPOSE 7000

HEALTHCHECK CMD curl -f -s -o /dev/null http://localhost:7000/ || exit 1

# Configure the IdP using build args only, so we avoid the downside of using the
# shell form of ENTRYPOINT (namely its lack of signal support).
RUN echo "#!/bin/sh\n\
node app.js --acsUrl=${SVC_PROTOCOL}://svc.doc:3000/saml/sso\
 --sloUrl=${SVC_PROTOCOL}://svc.doc:3000/saml/slo\
 --audience=urn:example:sp\
" > run.sh
RUN chmod +x run.sh

ENTRYPOINT [ "./run.sh" ]
