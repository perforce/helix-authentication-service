# Formik

* Status: accepted
* Deciders: Nathan Fiedler
* Date: 2023-10-20

## Context

Since the beginning the application has been configurable using environment
variables, which can be defined easily using a `.env` file located in the base
directory. This file consists of name/value pairs separted by equals sign (=).
This worked until it was necessary to have more complex values, such as
collections with nested properties. These would be defined using separate files,
such as the `logging.config.cjs` file for configuring the logging. The reason
for using JavaScript was that the original deployment method made use of the pm2
process manager, which was configured using a JavaScript file. With that
precedence established, other configuration files followed that were also in
JavaScript format (logging, SAML integration, Redis Sentinel), **except** for
the file that defines the configuration for one or more authentication providers
(`AUTH_PROVIERS_FILE`), which is in JSON because that can be stored directly in
the `.env` file using the setting named `AUTH_PROVIDERS`.

So in the end we have multiple configuration files in multiple formats:

* Basic configuration (.env)
* Auth providers (JSON)
* Logging (JS)
* Redis Sentinel (JS)
* SAML integration (JS)

Recent feature requests created the need to introduce *yet another* file to
capture the necessary complex configuration, and the choice of which format had
to be considered. Use a programming language (JavaScript), or use something
that's syntactically irritating (JSON), or use something altogether new? If
using a new file format, what would be a good choice?

This [blog post](https://jhall.io/posts/best-config-file-formats/) compares
several popular formats: environment variables (.env), YAML, and TOML. JSON was
ruled out because it doesn't support comments. YAML is a contender but its
syntax is especially expressive, better suited to something that developers
would write, like Docker Compose or Kubernetes manifests. The overall
recommendation was TOML because it is easy to read with a familiar INI-like
syntax that is also simple enough for normal people to write.

## Decision

[TOML](https://toml.io/): it's easy to read, looks a lot like `.env` already,
and captures **everything** we want to configure in a single file. No need for
the separate configuration files any more. Secrets and certificates are still
stored separately because those are meant to be secret and should not be sent
over email to support when a customer requests assistance. The authentication
service will use the `config.toml` file if it exists, otherwise it will rely on
`.env` as before. Environment variables are still utilized if the setting is not
explicitly configured, as before.

With regards to the naming convention, the settings in the `config.toml` should
be in lowercase with underscores, but can be written using uppercase as before.
Similarly, the nested settings can still be camelCase, but under_score naming
would be preferred in terms of aesthetics. The service will convert the naming
coming in and going out automatically, the user does not need to be aware.

## Consequence

By default, nothing about the service deployment changes for the majority of
users, they will continue to use the `.env` file and the other configuration
files. Only if they choose to use this new configuration file will they see any
difference. in the long run, it would be nice for everyone to eventually switch
over to the new configuration file as that would lighten the burden for
everyone.

## References

* https://jhall.io/posts/best-config-file-formats/ -- the only discussion that I could find that discussed configuration file formats and their pros and cons.
* https://rachelbythebay.com/w/2023/10/05/config/ -- an interesting proposal to use
ASCII protocol buffers for configuration. Even more cryptic and error-prone than YAML.
