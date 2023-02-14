# Formik

* Status: replaced
* Deciders: Nathan Fiedler
* Date: 2022-12-05

## Context

Web applications often consist of some form of user interface, often through
HTML forms. With user input it is expected to have helpful input validation and
feedback. To that end, form libraries can be very helpful. Given that this
application is using React, as decided earlier, it makes sense to consider what
the React community has suggested, and that happens to be
[Formik](https://formik.org). It is lightweight and easy to use with just enough
functionality to provide a good user experience.

## Decision

Use Formik as there really isn't any other good alternative that is well
maintained and integrates nicely with React.

## Consequence

After attempting to make changes to the form validation it became clear that the Formik library is not being maintained. Multiple issues filed in GitHub are asking if the project is dead. Turns out that there is an alternative that is similar to Formik and very much alive, named `react-hook-form`. As such, Formik was replaced in February of 2023.

## References

* [react-hook-form](https://react-hook-form.com/)
