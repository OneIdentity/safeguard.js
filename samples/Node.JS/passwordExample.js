// The trusted root ca of the appliance
const caFile = '';

// The appliance host name or IP address
const hostName = '';

// The user name for password authentication
const userName = '';

// The password for password authentication
const password = '';

const SafeguardJs = require('../../src/safeguard');

(async () => {
    try {
        SafeguardJs.addCAFromFile(caFile);

        console.log('Logging in', '\n');
        let connection = await SafeguardJs.connectPassword(hostName, userName, password);

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