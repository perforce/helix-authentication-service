# Microsoft Windows

The Helix Authentication Service can be deployed to Windows-based systems, and managed as a Windows service. The guide below outlines the installation and configuration process.

## Installation

### Prerequisites

Download and run the Windows-based installers for [Git](https://git-scm.com) and [Node.js](https://nodejs.org/) LTS. Note that the native tool chain, available via [chocolatey](https://chocolatey.org), is _not_ required for the authentication service.

### Installing Module Dependencies

Installing the module dependencies for the authentication service is done from a command prompt. Open a **PowerShell** window (preferably as an _Administrator_) and change to the directory containing the authentication service, then run the following commands (note that **order matters** here):

```
> cd helix-authentication-service
> npm ci --omit=dev --omit=optional
> npm -g install node-windows
> npm link --omit=dev --omit=optional node-windows
> node .\bin\install-windows-service.js
```

If running those commands as a normal user, as opposed to an administrator, there will be several **User Access Control** prompts from Windows to request permission for the installation of the service.

The authentication service is now installed and running as a Windows service. If the system restarts, the authentication service will be started automatically.

If the service does _not_ appear to be installed and running, then run the `uninstall` script and then install a second time. Ideally it would work the first time, but there seems to be an unknown issue that silently prevents the installation in some cases.

```
> node .\bin\uninstall-windows-service.js
> node .\bin\install-windows-service.js
```

## Starting and Stopping the Service

Once installed as a Windows service, with the name *Helix Authentication*, the authentication service can be started and stopped using the Windows service utilities. The **Services** application provides a graphical interface for this purpose, while the `NET` command is available from the command shell. For example, stopping the service from the command shell can be done using the `NET STOP` command, as shown below:

```
> net stop helixauthentication.exe
```

Similarly, the command `net start helixauthentication.exe` will start the service.

Note, you will need to run the `NET` command as an administrator.

## Configuration

The configuration of the authentication service is managed through environment variables. An easy method for setting the variables for the service is via a file named `.env` in the directory containing the authentication service. To start, copy the `example.env` file and paste with the name `.env` and then edit using a text editor. The `.env` file is a plain text file that contains names and values, separated by an equals (=) sign. For example:

```
SVC_BASE_URI=https://has.example.com
LOGGING='file://C:\\helix-auth-svc\\logging.config.cjs'
```

See the [Helix Authentication Service Administrator Guide](https://www.perforce.com/manuals/helix-auth-svc/Content/HAS/Home-has.html) configuration chapter for all of the available settings.

When modifying the `.env` file, you must stop and start the authentication service for the changes to take effect. See the section above for the commands to stop and start the service.

**Note:** When specifying values in the `.env` configuration file, you can enclose the values in single (') or double (") quotes. For file paths, you can use a single backslash (\\) or double (\\\\), both will be treated the same. The `LOGGING` setting requires the prefix `file://` when running on Windows.

## Logging

The output of the authentication service will be captured in text files in the `bin\daemon` directory within the directory containing the authentication service. The error output will be recorded in a file named `helixauthentication.err.log` and the normal output will be in a file named `helixauthentication.out.log`.

By default, basic logging of the service executable will be written to the Windows _event_ log in a source named `helixauthentication.exe`, showing when the service starts and stops, or has critical errors. There may also be a second source named `Helix Authentication wrapper` that is created by the program that runs the authentication service as a Windows service.

The authentication service itself also supports writing its own logging to the _events_ log, and this can be enabled by configuring the logging as described in the [Helix Authentication Service Administrator Guide](https://www.perforce.com/manuals/helix-auth-svc/Content/HAS/Home-has.html) configuration chapter. To enable logging to the Windows _event_ log, use the `transport` value of `event`, and optionally define additional properties, as described below.

| Name | Description | Default |
| ---- | ----------- | ------- |
| `eventLog` | Selects the event log scope, either `APPLICATION` or `SYSTEM`. | `APPLICATION` |
| `source` | Label used as the _source_ of the logging event. | `HelixAuthentication` |

An example of logging all messages at levels from `info` up to `error`, to the "SYSTEM" _events_ log, with a source named "Auth-Service", is shown below.

```javascript
export default {
  level: 'info',
  transport: 'event',
  event: {
    eventLog: 'SYSTEM',
    source: 'Auth-Service'
  }
}
```

**Note:** Certain versions of `node-windows` seem to send all logging to the _Application_ category in the event viewer, despite the value of the `eventLog` setting above.

## Removal

Open the **PowerShell** and execute the following commands from the installation directory of the Helix Authentication Service.

```
> net stop helixauthentication.exe
> node .\bin\uninstall-windows-service.js
```

The Windows service can also be stopped from the **Services** application, where its name is _Helix Authentication_, however the `uninstall-windows-service.js` must still be run from the shell.
