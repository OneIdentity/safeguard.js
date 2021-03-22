function getStatus(hostName) {
    if (hostName) {
        SafeguardJs.connectAnonymous(hostName, saveConnectionCallback);
    }
}

function saveConnectionCallback(safeguardConnection) {
    let connection = safeguardConnection;
    connection.invoke(SafeguardJs.Services.NOTIFICATION, SafeguardJs.HttpMethods.GET, 'v3/Status', null, null, null, displayCallback);
}

function displayCallback(results) {
    let dw = new DivWriter();
    dw.log(results);
}