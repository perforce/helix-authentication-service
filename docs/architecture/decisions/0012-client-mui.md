# Material UI

* Status: accepted
* Deciders: Nathan Fiedler
* Date: 2022-12-05

## Context

Web applications typically have a style that conforms to a particular
convention, often defined and codified in a component library, or CSS framework.
A popular CSS framework is [Bootstrap](https://getbootstrap.com), although it is
very utiliarian and tedious to use in practice. Another CSS framework of a
similar nature is [Bulma](https://bulma.io), but tends to be oversimplified.
Alternatively, there are component libraries that integrate well with React and
offer a cleaner, declarative approach to defining the interface.

One such component library is [Chakra-UI](https://chakra-ui.com), with many
well-defined components that are easy to use and include accessibility support.
However, it stands alone, not based on any particular guidelines or industry
standard.

Another component library that is similar in ease-of-use, as well as being
backed by a well-known organization (Google) that has spent years defining the
conventions and interface design guidelines, is [Material UI](https://mui.com),
based on [Material Design](https://m3.material.io) by Google. This component
system should be familiar to anyone who uses an Android device or Google web
site, as they all conform to this standard to some degree.

## Decision

Use Material UI for the component framework.

## Consequence

None as yet.
