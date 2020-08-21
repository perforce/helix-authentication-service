# Use Clean Architecture

* Status: accepted
* Deciders: Nathan Fiedler
* Date: 2020-08-20

## Context

All applications inevitably have some form of "design" applied to them, whether it be an ugly bag of mostly functions, or a disciplined model developed by a group of software design experts. A good design can have a dramatic effect on the quality of an application, enabling a developer to quickly become familiar with the existing code, and knowing where new functionality would fit into the big picture.

One simple and yet effective design is called the Clean Architecture, as described by Robert Martin in a blog post from 2012 (see references below). The application is divided into several layers, with dependencies between layers going in only one direction. This encourages loose coupling and enables thorough unit testing through isolation of units via mocking. The Clean Architecture builds on earlier models, including Hexagonal Architecture and the Onion Architecture, which similarly break up the application into layers, with dependencies flowing in one direction.

A [tutorial](https://resocoder.com/2019/08/27/flutter-tdd-clean-architecture-course-1-explanation-project-structure/) by Matt Rešetá on Dart and Flutter uses a version of the Clean Architecture in which the domain layer defines the interface for one or more repositories, whose implementation lives in the data layer. This separation is often not covered in other depictions of Clean Architecture, but is helpful for understanding how best to keep dependencies unidirectional, as well as encouraging loose coupling and easier testing.

## Decision

The version of Clean Architecture described by Matt Rešetá will be used.

Additionally, dependency injection (a.k.a. inversion of control) will be used to maintain a clean separation between layers and permit easy unit testing.

## Consequences

This design has been used in this application for several months, and it has proven to be very helpful. Testing is easier, knowing where to find code is easier, and knowing where to fit new code is straightforward. By starting with use cases, and working from there, the code practically designs itself, and discourages writing unnecessary things.

## Links

* Clean Architecture [cleancoder.com](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
