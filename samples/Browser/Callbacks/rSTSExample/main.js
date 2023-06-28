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

function getMe() {
    if (connection) {
        connection.invoke(SafeguardJs.Services.CORE, SafeguardJs.HttpMethods.GET, 'v4/Me', null, null, null, logMeCallback);
    } else {
        dw.log("You must log in first.");
    }
}

function logMeCallback(err, results) {
    if (err) {
        logError(err, `Failed to get 'Me'. `);
    } else {
        dw.log(results);
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