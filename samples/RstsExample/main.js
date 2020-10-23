function initialize() {
    /* This example uses the default SafeguardJs.storage which stores sessionStorage to persist authentication information.
     * By writing a new safeguardJs storage class, these authentication values can be stored elsewhere.
     * Further information can be found in the provided samples. */
    let storage = new SafeguardJs.Storage();
    let hostName = storage.getHostName();
    if (hostName)
    {
        SafeguardJs.connectRsts(hostName, `${window.location.protocol}//${window.location.host}${window.location.pathname}`, saveConnectionCallback);
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
        connection.invoke(SafeguardJs.Services.CORE, SafeguardJs.HttpMethods.GET, 'v3/Me', null, null, null, logMeCallback);
    }
    else {
        dw.log("You must log in first.");
    }
}

function logMeCallback(results) {
    dw.log(results);
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