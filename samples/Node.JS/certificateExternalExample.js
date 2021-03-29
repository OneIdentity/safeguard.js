// The trusted root ca of the appliance
const caFile = '';

// The root CA for external certificate authentication
const caExternalFile = '';

// The appliance host name or IP address
const hostName = '';

// A .pfx file for external certificate authentication
const userCertFile = '';

// The password for the .pfx file for external certificate authentication
const userCertPassphrase = '';

// The provider name or ID for external certificate authentication
const externalProvider = '';

const SafeguardJs = require('../../src/safeguard');

(async () => {
    try {
        SafeguardJs.addCAFromFile(caFile);
        SafeguardJs.addCAFromFile(caExternalFile);

        console.log('Logging in', '\n');
        let connection = await SafeguardJs.connectCertificateFromFiles(hostName, null, null, userCertFile, userCertPassphrase, externalProvider);

        console.log('Getting me');
        let result = await connection.invoke(SafeguardJs.Services.CORE, SafeguardJs.HttpMethods.GET, 'v3/Me');
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