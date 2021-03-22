function initialize() {
    /* This example uses the default SafeguardJs.storage which stores sessionStorage to persist authentication information.
     * By writing a new safeguardJs storage class, these authentication values can be stored elsewhere.
     * Further information can be found in the provided samples. */
    if (SafeguardJs.Storage && SafeguardJs.Storage.getHostName())
    {
        SafeguardJs.connectRsts(SafeguardJs.Storage.getHostName(), `${window.location.protocol}//${window.location.host}${window.location.pathname}`, saveConnectionCallback);
    }
}

function connectToSafeguard(hostName) {
    if (hostName) {
        SafeguardJs.connectRsts(hostName, `${window.location.protocol}//${window.location.host}${window.location.pathname}`, saveConnectionCallback);
    }
}

function saveConnectionCallback(safeguardConnection) {
    connection = safeguardConnection;
}

function createUser(userName, password) {
    if (connection && userName && password) {
        let user = {
            'PrimaryAuthenticationProviderId': -1,
            'UserName': userName
        };

        connection.invoke(SafeguardJs.Services.CORE, SafeguardJs.HttpMethods.POST, 'v3/Users', user, null, null, setPassword, `"${password}"`);
    }
    else {
        dw.log("You must be logged in and provide a user name and password first.");
    }
}

function setPassword(results, password) {
    let newUser = JSON.parse(results);
    if (newUser.statusText === "error") {
        dw.log(results);
    }
    else {
        dw.log(`User '${newUser.UserName}' created with ID: ${newUser.Id}`);
        connection.invoke(SafeguardJs.Services.CORE, SafeguardJs.HttpMethods.PUT, `v3/Users/${newUser.Id}/Password`, password, null, null, logResults);
    }
}

function logResults(results) {
    results = JSON.parse(results);

    if (results) {
        dw.log(results);
    }
    else {
        dw.log('Password set successfully.');
    }
}

function logout() {
    if (connection) {
        connection.logout(logoutCallback);
    }
}

function logoutCallback() {
    connection = null;
}

let dw = new DivWriter();
let connection = null;
initialize();