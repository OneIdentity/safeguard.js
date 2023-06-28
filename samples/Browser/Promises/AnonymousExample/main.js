let dw = new DivWriter();

function getStatus(hostName) {
    if (hostName) {
        let connection = SafeguardJs.connectAnonymous(hostName);

        connection.invoke(SafeguardJs.Services.NOTIFICATION, SafeguardJs.HttpMethods.GET, 'v4/Status')
        .then((results) => { 
            dw.log(results);
        })
        .catch((err) => { 
            logError(err, 'Failed to fetch appliance status. ');
        });
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