let dw = new DivWriter();
let connection = null;
initialize();

function initialize() {
    /* This example uses the default SafeguardJs.storage which stores sessionStorage to persist authentication information.
     * By writing a new safeguardJs storage class, these authentication values can be stored elsewhere.
     * Further information can be found in the provided samples. */
    if (SafeguardJs.Storage && SafeguardJs.Storage.getHostName())
    {
        SafeguardJs.connectRsts(SafeguardJs.Storage.getHostName(), `${window.location.protocol}//${window.location.host}${window.location.pathname}`)
        .then((results) => {
            connection = results;
        })
        .catch((err) => {
            dw.log(`Error: ${err}`);
        });
    }
}

function connectToSafeguard(hostName) {
    if (hostName) {
        SafeguardJs.connectRsts(hostName, `${window.location.protocol}//${window.location.host}${window.location.pathname}`);
    }
}

function registerSignalR() {
    if (connection) {
        connection.registerSignalR(logCallback);
    } else {
        dw.log("You must log in first.");
    }
}

function logCallback(results) {
    dw.log(`Received SignalR event: ${results.Message}`);
}

function logout() {
    if (connection) {
        connection.logout()
        .then(() => {
            connection = null;
        })
        .catch((err) => {
            dw.log(`Error: ${err}`);
        });
    }
}