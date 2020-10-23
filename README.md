# safeguard.js
One Identity Safeguard JavaScript SDK

-----------

<p align="center">
<i>Check out our <a href="Samples">sample projects</a> to get started with your own custom integration to Safeguard!</i>
</p>

-----------

## Support

One Identity open source projects are supported through [One Identity GitHub issues](https://github.com/OneIdentity/safeguard.js/issues) and the [One Identity Community](https://www.oneidentity.com/community/). This includes all scripts, plugins, SDKs, modules, code snippets or other solutions. For assistance with any One Identity GitHub project, please raise a new Issue on the [One Identity GitHub project](https://github.com/OneIdentity/safeguard.js/issues) page. You may also visit the [One Identity Community](https://www.oneidentity.com/community/) to ask questions.  Requests for assistance made through official One Identity Support will be referred back to GitHub and the One Identity Community forums where those requests can benefit all users.

## Introduction

All functionality in Safeguard is available via the Safeguard API. There is
nothing that can be done in the Safeguard UI that cannot also be performed
using the Safeguard API programmatically.

safeguard.js is provided to facilitate calling the Safeguard API from JavaScript.
It is meant to remove the complexity of dealing with authentication via
Safeguard's embedded secure token service (STS). The basic usage is to call
`Connect()` to establish a connection to Safeguard, then you can call
`Invoke()` multiple times using the same authenticated connection.

## Getting Started

A simple code example for calling the Safeguard API for authentication through
the standard Safeguard Rsts login page:

```JavaScript
SafeguardJs.connectRsts('safeguard.sample.corp', `${window.location.protocol}//${window.location.host}${window.location.pathname}`, saveConnectionCallback);

function saveConnectionCallback(safeguardConnection) {
    let connection = safeguardConnection;
    connection.invoke(SafeguardJs.Services.CORE, SafeguardJs.HttpMethods.GET, 'v3/Me', null, null, null, logMeCallback);
}

function logMeCallback(results) {
    console.log(${results});
}
```

Authentication is also possible using an existing Safeguard API token:

```JavaScript
let apiToken = GetTokenSomehow();
let storage = new SafeguardJs.storage;
storage.setUserToken(apiToken);

SafeguardJs.connectRsts('safeguard.sample.corp', `${window.location.protocol}//${window.location.host}${window.location.pathname}`, saveConnectionCallback);

function saveConnectionCallback(safeguardConnection) {
    let connection = safeguardConnection;
    connection.invoke(SafeguardJs.Services.CORE, SafeguardJs.HttpMethods.GET, 'v3/Me', null, null, null, logMeCallback);
}

function logMeCallback(results) {
    console.log(${results});
}
```

Both examples above use the default SafeguardJs.storage which stores
sessionStorage to persist authentication information. By writing a new
SafeguardJs storage class, these authentication values can be stored
elsewhere. Further information can be found inline at <a href="src/safeguard.js">safeguard.js</a>.


Calling the simple 'Me' endpoint provides information about the currently logged
on user.

## About the Safeguard API

The Safeguard API is a REST-based Web API. Safeguard API endpoints are called
using HTTP operators and JSON (or XML) requests and responses. The Safeguard API
is documented using Swagger. You may use Swagger UI to call the API directly or
to read the documentation about URLs, parameters, and payloads.

To access the Swagger UI use a browser to navigate to:
`https://<address>/service/<service>/swagger`

- `<address>` = Safeguard network address
- `<service>` = Safeguard service to use

The Safeguard API is made up of multiple services: core, appliance, notification,
and a2a.

|Service|Description|
|-|-|
|core|Most product functionality is found here. All cluster-wide operations: access request workflow, asset management, policy management, etc.|
|appliance|Appliance specific operations, such as setting IP address, maintenance, backups, support bundles, appliance management|
|notification|Anonymous, unauthenticated operations. This service is available even when the appliance isn't fully online|
|a2a|Application integration specific operations. Fetching passwords, making access requests on behalf of users, etc.|

Each of these services provides a separate Swagger endpoint.

You may use the `Authorize` button at the top of the screen to get an API token
to call the Safeguard API directly using Swagger.

### Examples

Most functionality is in the core service as mentioned above.  The notification service
provides read-only information for status, etc.

#### Anonymous Call for Safeguard Status

Sample can be found <a href="Samples\AnonymousExample">here</a>.

```JavaScript
SafeguardJs.connectAnonymous('safeguard.sample.corp', saveConnectionCallback);

function saveConnectionCallback(safeguardConnection) {
    let connection = safeguardConnection;
    connection.invoke(SafeguardJs.Services.CORE, SafeguardJs.HttpMethods.GET, 'v3/Me', null, null, null, logMeCallback);
}

function logMeCallback(results) {
    console.log(${results});
}
```

#### Create a New User and Set the Password

Sample can be found <a href="Samples\NewUserExample">here</a>.

```JavaScript
let user = {
    'PrimaryAuthenticationProviderId': -1,
    'UserName': 'MyNewUser'
};
let password = 'MyNewUser123';

connection.invoke(SafeguardJs.Services.CORE, SafeguardJs.HttpMethods.POST, 'v3/Users', user, null, null, setPassword, password);

function setPassword(results, password) {
    let newUser = JSON.parse(results);
    connection.invoke(SafeguardJs.Services.CORE, SafeguardJs.HttpMethods.PUT, `v3/Users/${newUser.Id}/Password`, password, null, null, logResults);
}
```