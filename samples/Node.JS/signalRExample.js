// The trusted root ca of the appliance
const caFile = '';

// The appliance host name or IP address
const hostName = '';

// The user name for password authentication
const userName = '';

// The password for password authentication
const password = '';

const SafeguardJs = require('../../src/safeguard');

function callback(ev) {
    console.log(`Received SignalR event: ${ev.Message}`);
}

(async () => {
    try {
        SafeguardJs.addCAFromFile(caFile);

        console.log('Logging in', '\n');
        let connection = await SafeguardJs.connectPassword(hostName, userName, password);

        console.log('Calling SignalR registration');
        await connection.registerSignalR(callback);
    } catch (e) {
        console.log(e);
    }
})();