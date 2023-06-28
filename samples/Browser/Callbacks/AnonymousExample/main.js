let dw = new DivWriter();

function getStatus(hostName) {
    if (hostName) {
        SafeguardJs.connectAnonymous(hostName, saveConnectionCallback);
    }
}

function saveConnectionCallback(safeguardConnection) {
    let connection = safeguardConnection;
    connection.invoke(SafeguardJs.Services.NOTIFICATION, SafeguardJs.HttpMethods.GET, 'v4/Status', null, null, null, displayCallback);
}

function displayCallback(err, results) {
    if (err) {
        logError(err, 'Failed to fetch appliance status. ');
    } else {
        dw.log(results);
    }
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