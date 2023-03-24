#
# Shibboleth SAML IdP hosted on Jetty (https://eclipse.org/jetty)
#
# While a jetty docker image exists, it is only suitable for deploying war files
# via the web interface as the image prevents running most commands. Shibboleth
# requires running an installation script, changing file ownership, and using
# specific paths for installation in order to avoid setting a property in the
# JVM, which is difficult without full control of everything.
#
# N.B. future versions of Jetty and the JDK will necessitate the installation of
# the Nashorn plugin for Shibboleth, which adds support for JavaScript. Versions
# of the JDK before JDK 17 included a JavaScript engine, but that has since been
# removed. However, installing plugins in Shibboleth during the docker build is
# not possible due to the plugin installer insisting on user interaction to
# accept the plugin truststore.
#
# How this image was constructed:
#
# 1. Start with a stable base image that supports Java.
# 2. Install a version of Jetty that is compatible with Shibboleth.
# 3. Learn how to get Jetty running and serving the basic landing page.
# 4. Using the Shibboleth instructions, retrieve the tarball and run the install.
# 5. Examine the results and compare with the files being added by the build.
#    Get shell access to the container and compare the generated configuration with the
#    files in our repository, make adjustments as needed.
#    a. LDAP configuration and attribute resolvers
#    b. metadata providers
#    c. IdP and SP metadata
#    d. nameid configuration to allow email address
#
FROM debian:stable

ENV DEBIAN_FRONTEND noninteractive
RUN apt-get update --fix-missing && \
    apt-get -y install curl jetty9

WORKDIR /build
ADD https://shibboleth.net/downloads/identity-provider/latest4/shibboleth-identity-provider-4.3.0.tar.gz .
RUN tar zxf shibboleth-identity-provider-4.3.0.tar.gz
ADD idp.properties .
RUN cd shibboleth-identity-provider-4.3.0 && \
    ./bin/install.sh \
    -Didp.property.file=/build/idp.properties \
    -Didp.src.dir=/build/shibboleth-identity-provider-4.3.0
WORKDIR /opt/shibboleth-idp
ADD attribute-resolver.xml ./conf/attribute-resolver.xml
ADD ldap.properties ./conf/ldap.properties
ADD metadata-providers.xml ./conf/metadata-providers.xml
ADD saml-nameid.xml ./conf/saml-nameid.xml
# Produce the IdP metadata via hand-crafted XML with placeholders; would have
# used the metadatagen tool but that requires user interaction to accept the
# truststore when installing the plugin.
ADD idp-metadata.xml ./metadata/idp-metadata.template
# inject the generated certificates into the idp metadata
RUN sed -e '/SIGNING_CERT/r ./credentials/idp-signing.crt' ./metadata/idp-metadata.template | \
    sed -e 's/SIGNING_CERT//' -e '/ENCRYPTION_CERT/r ./credentials/idp-encryption.crt' | \
    sed -e 's/ENCRYPTION_CERT//' -e 's/-----BEGIN CERTIFICATE-----//' -e 's/-----END CERTIFICATE-----//' >./metadata/idp-metadata.xml
ADD has-metadata.xml ./metadata/has-metadata.xml
RUN chown -R jetty:jetty .

# run jetty from this directory to help it find everything; alternatively could
# pass -Djetty.home=/usr/share/jetty9 every time
WORKDIR /usr/share/jetty9
RUN java -jar start.jar --create-startd
RUN java -jar start.jar --add-to-start=https,deploy --approve-all-licenses
RUN cp /opt/shibboleth-idp/war/idp.war /var/lib/jetty9/webapps

USER jetty
HEALTHCHECK CMD curl -k -f -s -I https://localhost:4443/idp/shibboleth || exit 1

# Jetty will default to /usr/share/java to find its configuration files, unless
# jetty.home is set at run time.
ENTRYPOINT [ "java", "-Djetty.ssl.port=4443", "-Djetty.home=/usr/share/jetty9", "-jar", "start.jar" ]
