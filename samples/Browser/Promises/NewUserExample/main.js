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

function createUser(userName, password) {
    if (connection && userName && password) {
        let user = {
            'PrimaryAuthenticationProviderId': -1,
            'UserName': userName
        };

        connection.invoke(SafeguardJs.Services.CORE, SafeguardJs.HttpMethods.POST, 'v3/Users', user)
        .then((results) => {
            let newUser = JSON.parse(results);
            dw.log(`User '${newUser.UserName}' created with ID: ${newUser.Id}`);
            connection.invoke(SafeguardJs.Services.CORE, SafeguardJs.HttpMethods.PUT, `v3/Users/${newUser.Id}/Password`, `"${password}"`)
            .then(() => {
                dw.log('Password set successfully.');
            })
            .catch((err) => {
                logError(err, `Failed to set the new user's password. `);
            });
        })
        .catch((err) => {
            logError(err, 'User creation failed. ');
        });
    }
    else {
        dw.log("You must be logged in and provide a user name and password first.");
    }
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