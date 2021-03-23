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

function registerSignalR() {
    if (connection) {
        connection.registerSignalR(logCallback);
    } else {
        dw.log("You must log in first.");
    }
}

function saveConnectionCallback(safeguardConnection) {
    connection = safeguardConnection;
}

function logCallback(results) {
    dw.log(`Received SignalR event: ${results.Message}`);
}

function logout() {
    if (connection) {
        connection.logout(logoutCallback);
    }
}

function logoutCallback() {
    connection = null;
}