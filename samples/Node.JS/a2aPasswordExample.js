// The trusted root ca of the appliance
const caFile = '';

// The appliance host name or IP address
const hostName = '';

// The API Key for password retrieval via A2A
const a2aApiKey = '';

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

        console.log('Retrieving A2A password');
        let result = await SafeguardJs.a2aGetCredentialFromFiles(hostName, a2aApiKey, SafeguardJs.A2ATypes.PASSWORD, null, userCertFile, userKeyFile, userCertPassphrase);
        console.log(result);
    } catch (e) {
        console.log(e);
    }
})();