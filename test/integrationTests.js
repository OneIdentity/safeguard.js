const assert = require('assert');
const ls = require('../src/LocalStorage');
const sg = require('../src/safeguard');
const config = require('./config.js');

sg.addCAFromFile(config.caFile);

/*
 * Test connecting anonymously
 */
describe('ConnectAnonymous', function() {
    let localStorage = new ls.LocalStorage;

    it('ShouldConnectAndInvokeNotificationStatusWithoutError', async function() {
        let connection = sg.connectAnonymous(config.hostName, null, localStorage);
        assert.strictEqual(localStorage.getHostName(), config.hostName);
        assert.strictEqual(localStorage.getAccessToken(), '');
        assert.strictEqual(localStorage.getUserToken(), '');
        await assert.doesNotReject(async () => await connection.invoke(sg.Services.NOTIFICATION, sg.HttpMethods.GET, 'v4/Status'));
    });
});

/*
 * Test connecting via password authentication
 */
describe('ConnectPassword', function() {
    it('ShouldConnectAndSetUserToken', async function() {
        let localStorage = new ls.LocalStorage;
        await sg.connectPassword(config.hostName, config.passwordUserName, config.passwordPassword, null, null, localStorage);
        assert.strictEqual(localStorage.getHostName(), config.hostName);
        assert.notStrictEqual(localStorage.getAccessToken(), '');
        assert.notStrictEqual(localStorage.getUserToken(), '');
    });

    it('ShouldConnectAndSetUserTokenExternalProvider', async function() {
        let localStorage = new ls.LocalStorage;
        await sg.connectPassword(config.hostName, config.externalUserName, config.externalPassword, config.externalProvider, null, localStorage);
        assert.strictEqual(localStorage.getHostName(), config.hostName);
        assert.notStrictEqual(localStorage.getAccessToken(), '');
        assert.notStrictEqual(localStorage.getUserToken(), '');
    });
});
    
/*
 * Test connecting via certificate authentication
 */
describe('ConnectCertificate', function() {
    it('ShouldConnectAndSetUserToken', async function() {
        let localStorage = new ls.LocalStorage;
        await sg.connectCertificateFromFiles(config.hostName, config.userCertificateFile, config.userCertificateKey, null, config.userCertificatePassphrase, null, null, localStorage);
        assert.strictEqual(localStorage.getHostName(), config.hostName);
        assert.notStrictEqual(localStorage.getAccessToken(), '');
        assert.notStrictEqual(localStorage.getUserToken(), '');
    });

    it('ShouldConnectAndSetUserTokenExternalProvider', async function() {
        let localStorage = new ls.LocalStorage;
        sg.addCAFromFile(config.externalCertificateCA);

        await sg.connectCertificateFromFiles(config.hostName, null, null, config.externalUserCertificateFile, config.externalCertificatePassphrase, config.externalCertificateProvider, null, localStorage);
        assert.strictEqual(localStorage.getHostName(), config.hostName);
        assert.notStrictEqual(localStorage.getAccessToken(), '');
        assert.notStrictEqual(localStorage.getUserToken(), '');
    });
});

/*
 * Test a2a credential retrieval tests
 */
describe('a2aGetCredentialFiles', function() {
    it('ShouldRetrieveA2APassword', async function() {
        await assert.doesNotReject(async () => await sg.a2aGetCredentialFromFiles(config.hostName, config.a2aPasswordApiKey, sg.A2ATypes.PASSWORD, null, config.a2aCertificateFile, config.a2aKeyFile, config.a2aKeyPassphrase));
    });

    it('ShouldRetrieveA2ASSHKeyDefault', async function() {
        await assert.doesNotReject(async () => await sg.a2aGetCredentialFromFiles(config.hostName, config.a2aSshKeyApiKey, sg.A2ATypes.PRIVATEKEY, null, config.a2aCertificateFile, config.a2aKeyFile, config.a2aKeyPassphrase));
    });

    it('ShouldRetrieveA2ASSHKeyOpenSSH', async function() {
        await assert.doesNotReject(async () => await sg.a2aGetCredentialFromFiles(config.hostName, config.a2aSshKeyApiKey, sg.A2ATypes.PRIVATEKEY, sg.SshKeyFormats.OPENSSH, config.a2aCertificateFile, config.a2aKeyFile, config.a2aKeyPassphrase));
    });

    it('ShouldRetrieveA2ASSHKeySSH2', async function() {
        await assert.doesNotReject(async () => await sg.a2aGetCredentialFromFiles(config.hostName, config.a2aSshKeyApiKey, sg.A2ATypes.PRIVATEKEY, sg.SshKeyFormats.SSH2, config.a2aCertificateFile, config.a2aKeyFile, config.a2aKeyPassphrase));
    });

    it('ShouldRetrieveA2ASSHKeyPutty', async function() {
        await assert.doesNotReject(async () => await sg.a2aGetCredentialFromFiles(config.hostName, config.a2aSshKeyApiKey, sg.A2ATypes.PRIVATEKEY, sg.SshKeyFormats.PUTTY, config.a2aCertificateFile, config.a2aKeyFile, config.a2aKeyPassphrase));
    });

    it('ShouldFailToRetrieveA2ASSHKeyNonsense', async function() {
        await assert.rejects(async () => await sg.a2aGetCredentialFromFiles(config.hostName, config.a2aSshKeyApiKey, 'nonsense', sg.SshKeyFormats.PUTTY, config.a2aCertificateFile, config.a2aKeyFile, config.a2aKeyPassphrase));
    });
});

/*
 * Test logout
 */
describe('Logout', function() {
    let localStorage = new ls.LocalStorage;

    it('ShouldClearTokensOnLogout', async function() {
        let connection = await sg.connectPassword(config.hostName, config.passwordUserName, config.passwordPassword, null, null, localStorage);
        assert.strictEqual(localStorage.getHostName(), config.hostName);
        assert.notStrictEqual(localStorage.getAccessToken(), '');
        assert.notStrictEqual(localStorage.getUserToken(), '');

        let result = await connection.logout();
        assert.strictEqual(localStorage.getHostName(), '');
        assert.strictEqual(localStorage.getAccessToken(), '');
        assert.strictEqual(localStorage.getUserToken(), '');
        assert.strictEqual(result, '""');
    });
});


/*
 * Test access token lifetime remaining
 */
describe('Access Token Lifetime Remaining', function() {
    let localStorage = new ls.LocalStorage;

    it('ShouldRetrieveAccessTokenLifetimeRemaining', async function() {
        let connection = await sg.connectPassword(config.hostName, config.passwordUserName, config.passwordPassword, null, null, localStorage);
        let result = await connection.getAccessTokenLifetimeRemaining();        
        assert.notStrictEqual(parseInt(result), NaN); // Ensure only a number is returned. NaN - not a number
    });
});

/*
 * Test provider resolution
 */
describe('External Provider', function() {
    it('ShouldResolveToDefaultValueWhenNoProvider', async function() {
        let result = await sg._getProviderId(config.hostName, 'local');
        assert.strictEqual(result, 'local');
    });

    it('ShouldResolveToDefaultValueWhenLocalProvider', async function() {
        let result = await sg._getProviderId(config.hostName, 'local', 'local');
        assert.strictEqual(result, 'local');
    });

    it('ShouldResolveToDefaultValueWhenCertificateProvider', async function() {
        let result = await sg._getProviderId(config.hostName, 'certificate', 'certificate');
        assert.strictEqual(result, 'certificate');
    });
});

/*
 * Test certificate authority store
 */
describe('Certificate authority store', function() {
    it('ShouldAddCAToArray', async function() {
        let numberOfCerts = sg.CAs.length;
        sg.addCAFromFile(config.caFile);
        assert.strictEqual(sg.CAs.length, numberOfCerts + 1);
        sg.addCAFromFile(config.caFile);
        assert.strictEqual(sg.CAs.length, numberOfCerts + 2);
    });

    it('ShouldClearCAArray', async function() {
        sg.clearCAs();
        assert.strictEqual(sg.CAs.length, 0);
    });
});