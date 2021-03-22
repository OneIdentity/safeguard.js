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
`connect()` to establish a connection to Safeguard, then you can call
`invoke()` multiple times using the same authenticated connection.

safeguard.js also provides an easy way to call Safeguard A2A from JavaScript. The A2A service requires client certificate authentication for retrieving passwords for application integration. When Safeguard A2A is properly configured, specified passwords can be retrieved with a single method call without requiring access request workflow approvals. Safeguard A2A is protected by API keys and IP restrictions in addition to client certificate authentication.

safeguard.js includes an SDK for listening to Safeguard's powerful, real-time event notification system. Safeguard provides role-based event notifications via SignalR to subscribed clients. If a Safeguard user is an Asset Administrator events related to the creation, modification, or deletion of Assets and Asset Accounts will be sent to that user. When used with a certificate user, this provides an opportunity for reacting programmatically to any data modification in Safeguard. Events are also supported for access request workflow and for A2A password changes.

## Getting Started

A simple code example for calling the Safeguard API for authentication through
the standard Safeguard Rsts login page:

```JavaScript
// Browser Example
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
// Browser Example
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

For Node.JS, password authentication is available:

```JavaScript
// Node.JS Example
SafeguardJs.addCAFromFile('ssl/ca.pem');
let connection = await SafeguardJs.connectPassword('safeguard.sample.corp', 'myuser', 'mypassword');
let result = await connection.invoke(sg.Services.CORE, sg.HttpMethods.GET, 'v3/Me');
console.log(result);
```

Password authentication to an external provider is as follows:

```JavaScript
// Node.JS Example
SafeguardJs.addCAFromFile('ssl/ca.pem');
let connection = await SafeguardJs.connectPassword('safeguard.sample.corp', 'myuser', 'mypassword', 'myexternalprovider');
let result = await connection.invoke(sg.Services.CORE, sg.HttpMethods.GET, 'v3/Me');
console.log(result);
```


Client certificate authentication is also available. This can be done either using a PFX certificate file or a PEM and KEY.

```JavaScript
// Node.JS Example
SafeguardJs.addCAFromFile('ssl/ca.pem');
let connection = await SafeguardJs.connectCertificateFile('safeguard.sample.corp', 'ssl/certificateuser.pem', 'ssl/certificateuser.key', null, 'password');
let result = await connection.invoke(SafeguardJs.Services.CORE, SafeguardJs.HttpMethods.GET, 'v3/Me');
console.log(result);
```

Client certificate authentication to an external provider is as follows:

```JavaScript
// Node.JS Example
SafeguardJs.addCAFromFile('ssl/ca.pem');
let connection = await SafeguardJs.connectCertificateFile('safeguard.sample.corp', 'ssl/certificateuser.pem', 'ssl/certificateuser.key', null, 'password', 'myexternalprovider');
let result = await connection.invoke(SafeguardJs.Services.CORE, SafeguardJs.HttpMethods.GET, 'v3/Me');
console.log(result);
```

A connection can also be made anonymously 

```JavaScript
// Node.JS Example
SafeguardJs.addCAFromFile('ssl/ca.pem');
let connection = SafeguardJs.connectAnonymous('safeguard.sample.corp', null, localStorage);
let result = await connection.invoke(SafeguardJs.Services.NOTIFICATION, SafeguardJs.HttpMethods.GET, 'v3/Status');
console.log(result);
```

Two-factor authentication can only be performed through `connectRsts()`, so that the secure token service can use the browser agent to redirect you to multiple authentication providers.

All examples above use the default SafeguardJs.storage locations. For RSTS and anonymous connections, SessionStorage is used to persist authentication information. For password and certificate authentication, LocalStorage is used, which is an in memory storage. By writing a new SafeguardJs storage class, these authentication values can be stored
elsewhere. Further information can be found inline at <a href="src/SessionStorage.js">safeguard.js</a>.


Calling the simple 'Me' endpoint provides information about the currently logged
on user.

Calling the 'Status' endpoint provides gneral status information about the appliance and can be accessed anonymously.

## Getting Started With A2A

Once you have configured your A2A registration in Safeguard you can retrieve an A2A password or private key using a certificate and api key.

To retrieve a password via A2A:

```JavaScript
// Node.JS Example
SafeguardJs.addCAFromFile('ssl/ca.pem');
let password = await SafeguardJs.a2aGetCredentialFiles('172.21.21.11', 'myapikey', SafeguardJs.A2ATypes.PASSWORD, null, 'ssl/certificateuser.pem', 'ssl/certificateuser.key', 'password', 'ssl/hyperv.local.CA.pem');
```

To retrieve a private key via A2A:

```JavaScript
// Node.JS Example
SafeguardJs.addCAFromFile('ssl/ca.pem');
let privateKey = await SafeguardJs.a2aGetCredentialFiles('172.21.21.11', 'myapikey', SafeguardJs.A2ATypes.PRIVATEKEY, null, 'ssl/certificateuser.pem', 'ssl/certificateuser.key', 'password', 'ssl/hyperv.local.CA.pem');
```

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
// Browser Example
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
// Browser Example
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