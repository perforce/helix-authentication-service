# Build Notes

## CentOS vs RHEL vs Rocky Linux

RHEL 7, and in turn, CentOS 7, are supported until June 30, 2024.

CentOS Stream 8 builds will continue until May 31, 2024.

CentOS Stream 9 is the latest official stream for CentOS.

[Rocky Linux](https://rockylinux.org) "is an open-source enterprise operating
system designed to be 100% bug-for-bug compatible with Red Hat Enterprise Linux"
according to the web site.

## Package Builds

The packages and tests for this application use Docker exclusively as that is
the best method for a portable and repeatable build and test process. As such,
it is necessary to use official images when building for the various platforms.
With Ubuntu and Rocky Linux this is very easy as Docker Hub contains official
images for all releases. However, for CentOS and RHEL this becomes much more
difficult.

The old CentOS docker images are deprecated and are no longer maintained. The
package repositories for CentOS 8 are broken or gone entirely, so building for
that release requires using a hacked up, manually built, base image. This image
definition is found in the `centos8_base` directory and an image tar is found on
the build resource.

The docker images for the latest "stream" builds for CentOS, `stream9`, are only
available on a RedHat site named [quay.io](https://quay.io/), which requires a
RedHat account to access. For this reason, the packages for RHEL 9 are built
using the Rocky Linux 9 docker image (`rockylinux:9`).

## References

* https://blog.centos.org/2023/04/end-dates-are-coming-for-centos-stream-8-and-centos-linux-7/
* [CentOS docker deprecation notice](https://hub.docker.com/_/centos)
