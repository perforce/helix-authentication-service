# Use JavaScript on Node.js

* Status: accepted
* Deciders: Nathan Fiedler
* Date: 2020-08-20

## Context

In terms of the application implementation, the programming language and run time environment are important decisions. Significant factors include the general availability of developers, the level of support available in the community, and resources for learning, developing, and maintaining an application in that language.

## Decision

JavaScript is, at least according to the Stack Overflow Developer Surveys, far and away a very popular choice of programming language. This is due in large part to the proliferation of web browsers, which natively run JavaScript, but also can be credited to Node.js, which makes writing backend systems almost as easy as writing the frontend client in the browser.

Applications running on Node are sufficiently fast, especially compared to Python or Ruby, and JavaScript is a small and predictable language when compared to PHP. There are multiple OIDC and SAML libraries for Node to choose from. In general the Node ecosystem is huge, so finding libraries with permissive licenses is very easy. Deploying to a variety of systems is well supported.

As such, this application will be written in **JavaScript** and the run time environment will be **Node.js**.

## Consequence

To date the project has been working well and the choice of language and run time has not been an issue. For the most part, customers are unaware of these implementation details.

## Links

* Node.js [website](https://nodejs.org/)
