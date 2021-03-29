// The trusted root ca of the appliance
const caFile = '';

// The appliance host name or IP address
const hostName = '';

const SafeguardJs = require('../../src/safeguard');
const localStorage = require('../../src/LocalStorage');

(async () => {
    try {
        SafeguardJs.addCAFromFile(caFile);

        console.log('Connecting anonymously', '\n');
        let connection = await SafeguardJs.connectAnonymous(hostName, null, new localStorage.LocalStorage);

        console.log('Getting status');
        let result = await connection.invoke(SafeguardJs.Services.NOTIFICATION, SafeguardJs.HttpMethods.GET, 'v3/Status');
        console.log(result, '\n');
    } catch (e) {
        console.log(e);
    }
})();