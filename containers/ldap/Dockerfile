FROM osixia/openldap:1.2.5
# The default image will create an empty ldap for the company Example Inc. and
# the domain example.org. By default the admin has the password "admin".

#
# Define a users group and a user with a known password.
#
ADD add-entries.ldif /container/service/slapd/assets/config/bootstrap/ldif/custom

#
# How to verify it is working:
#
# $ ldapsearch -x -H ldap://192.168.99.100:389 -b dc=example,dc=org -D "cn=admin,dc=example,dc=org" -w admin
#
