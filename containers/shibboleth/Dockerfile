FROM unicon/shibboleth-idp:3.4.3

ADD shibboleth-idp/ /opt/shibboleth-idp/

HEALTHCHECK CMD curl -k -f -s -I https://localhost:4443/idp/shibboleth || exit 1
