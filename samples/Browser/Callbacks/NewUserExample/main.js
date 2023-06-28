let dw = new DivWriter();
let connection = null;
initialize();

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

        connection.invoke(SafeguardJs.Services.CORE, SafeguardJs.HttpMethods.POST, 'v4/Users', user, null, null, setPassword, `"${password}"`);
    } else {
        dw.log("You must be logged in and provide a user name and password first.");
    }
}

function setPassword(err, results, password) {
    if (err) {
        logError(err, 'User creation failed. ');
    } else {
        let newUser = JSON.parse(results);
        dw.log(`User '${newUser.UserName}' created with ID: ${newUser.Id}`);
        connection.invoke(SafeguardJs.Services.CORE, SafeguardJs.HttpMethods.PUT, `v4/Users/${newUser.Id}/Password`, password, null, null, logResults);
    }
}

function logResults(err, results) {
    if (err) {
        logError(err, `Failed to set the new user's password. `);
    } else {
        results = JSON.parse(results);

        if (results) {
            dw.log(results);
        } else {
            dw.log('Password set successfully.');
        }
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

function logError(error, message) {
    try {
        let obj = JSON.parse(error.message);
        if (obj.Message) {
            dw.log(message.concat(obj.Message));
        } else {
            dw.log(message.concat(error));
        }
    } catch (err) {
        dw.log(message.concat(error));
    }
}