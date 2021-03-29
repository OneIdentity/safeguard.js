// The trusted root ca of the appliance
const caFile = '';

// The appliance host name or IP address
const hostName = '';

// The API Key for private key retrieval via A2A
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

        console.log('Retrieving A2A private key in OpenSSH format');
        let result = await SafeguardJs.a2aGetCredentialFromFiles(hostName, a2aApiKey, SafeguardJs.A2ATypes.PRIVATEKEY, SafeguardJs.SshKeyFormats.OPENSSH, userCertFile, userKeyFile, userCertPassphrase);
        console.log(result, '\n');

        console.log('Retrieving A2A private key in SSH2 format');
        result = await SafeguardJs.a2aGetCredentialFromFiles(hostName, a2aApiKey, SafeguardJs.A2ATypes.PRIVATEKEY, SafeguardJs.SshKeyFormats.SSH2, userCertFile, userKeyFile, userCertPassphrase);
        console.log(result, '\n');

        console.log('Retrieving A2A private key in Putty format');
        result = await SafeguardJs.a2aGetCredentialFromFiles(hostName, a2aApiKey, SafeguardJs.A2ATypes.PRIVATEKEY, SafeguardJs.SshKeyFormats.PUTTY, userCertFile, userKeyFile, userCertPassphrase);
        console.log(result, '\n');
    } catch (e) {
        console.log(e);
    }
})();