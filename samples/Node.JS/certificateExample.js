// The trusted root ca of the appliance
const caFile = '';

// The appliance host name or IP address
const hostName = '';

// A .pem file for certificate authentication
const userCertFile = '';

// The corresponding .key file for certificate authentication
const userKeyFile = '';

// The password for the .key file for certificate authentication
const userCertPassphrase = '';

const SafeguardJs = require('../../src/safeguard');

(async () => {
    try {
        SafeguardJs.addCAFromFile(caFile);

        console.log('Logging in', '\n');
        let connection = await SafeguardJs.connectCertificateFromFiles(hostName, userCertFile, userKeyFile, null, userCertPassphrase);

        console.log('Getting me');
        let result = await connection.invoke(SafeguardJs.Services.CORE, SafeguardJs.HttpMethods.GET, 'v4/Me');
        console.log(result, '\n');
    
        console.log('Getting login time remaining');
        result = await connection.getAccessTokenLifetimeRemaining();
        console.log(`Time remaining: ${result}`, '\n');
    
        console.log('Logging out');
        await connection.logout();
    } catch (e) {
        console.log(e);
    }
})();