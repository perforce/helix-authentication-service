FROM osixia/openldap:1.2.4
# The default image will create an empty ldap for the company Example Inc. and
# the domain example.org. By default the admin has the password "admin".

#
# Define a users group and a user with a known password.
#
ADD 01-users-group.ldif /container/service/slapd/assets/config/bootstrap/ldif/custom
ADD 02-add-george.ldif /container/service/slapd/assets/config/bootstrap/ldif/custom
ADD 03-set-passwd.ldif /container/service/slapd/assets/config/bootstrap/ldif/custom

#
# Testing...
#
# $ ldapsearch -x -H ldap://192.168.99.100:389 -b dc=example,dc=org -D "cn=admin,dc=example,dc=org" -w admin
# ...
#
# $ p4 -u super -p p4d.doc:1666 ldap simple
# Name:	simple
# Host:	ldap.doc
# Port:	389
# Encryption:	none
# BindMethod:	simple
# Options:	nodowncase nogetattrs norealminusername
# SimplePattern:	uid=%user%,ou=users,dc=example,dc=org
# SearchScope:	subtree
# GroupSearchScope:	subtree
#
# $ p4 -u super -p p4d.doc:1666 user george
# User:	george
# Email:	george@example.org
# FullName:	Curious George
#
# $ p4 -u super -p p4d.doc:1666 ldap -t george simple
# Enter password:
# Authentication successful.
#
