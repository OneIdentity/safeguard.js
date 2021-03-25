const assert = require('assert');
const ls = require('../src/LocalStorage');
const sg = require('../src/safeguard');

/*
 * Test certificate authority store
 */
describe('Certificate authority store', function() {
    it('ShouldAddCAToArray', async function() {
        let numberOfCerts = sg.CAs.length;
        sg.addCA('myca');
        assert.strictEqual(sg.CAs.length, numberOfCerts + 1);
        sg.addCA('myca2');
        assert.strictEqual(sg.CAs.length, numberOfCerts + 2);
    });

    it('ShouldClearCAArray', async function() {
        sg.clearCAs();
        assert.strictEqual(sg.CAs.length, 0);
    });
});

/*
 * Local storage tests
 */
describe('LocalStorage', function() {
    let hostName = 'exampleHostName.local';
    let accessToken = 'exampleAccessToken';
    let userToken = 'exampleUserToken';
    
    describe('hostName', function() {
        let storage = new ls.LocalStorage;

        it('ShouldBeEmptyAfterInitialization', function() {
            assert.strictEqual(storage.getHostName(), '');
        });

        it('ShouldReturnHostNameAfterSetHostName', function() {
          storage.setHostName(hostName);
          assert.strictEqual(storage.getHostName(), hostName);
        });

        it('ShouldBeEmptyAfterClearingStorage', function() {
            storage.clearStorage();
            assert.strictEqual(storage.getHostName(), '');
        });
    });


    describe('accessToken', function() {
        let storage = new ls.LocalStorage;

        it('ShouldBeEmptyAfterInitialization', function() {
            assert.strictEqual(storage.getAccessToken(), '');
        });

        it('ShouldReturnAccessTokenAfterSetAccessToken', function() {
          storage.setAccessToken(accessToken);
          assert.strictEqual(storage.getAccessToken(), accessToken);
        });

        it('ShouldBeEmptyAfterClearingStorage', function() {
            storage.clearStorage();
            assert.strictEqual(storage.getAccessToken(), '');
        });
    });

    describe('userToken', function() {
        let storage = new ls.LocalStorage;

        it('ShouldBeEmptyAfterInitialization', function() {
            assert.strictEqual(storage.getUserToken(), '');
        });

        it('ShouldReturnUserTokenAfterSetUserToken', function() {
          storage.setUserToken(userToken);
          assert.strictEqual(storage.getUserToken(), userToken);
        });

        it('ShouldBeEmptyAfterClearingStorage', function() {
            storage.clearStorage();
            assert.strictEqual(storage.getUserToken(), '');
        });
    });
});

/*
 * Tests for SafeguardConnection
 */
describe('SafeguardConnection', function() {
    let hostName = 'exampleHostName.local';
    let relativeUrl = 'v3/something';

    it('ShouldHaveHostNameAfterInitialization', function() {
        let connection = new sg.SafeguardConnection(hostName);
        assert.strictEqual(connection.hostName, hostName);
    });

    it('ShouldThrowIfHostNameIsNull', function() {
        assert.throws(() => { new sg.SafeguardConnection(null) }, Error);
    });

    it('ShouldThrowIfHostNameIsEmpty', function() {
        assert.throws(() => { new sg.SafeguardConnection('') }, Error);
    });

    it('ShouldAllowCoreService', function() {
        let connection = new sg.SafeguardConnection(hostName);
        let url = connection._constructUrl(sg.Services.CORE, relativeUrl)
        assert.strictEqual(url, `https://${hostName}/service/core/${relativeUrl}`);
    });

    it('ShouldAllowApplianceService', function() {
        let connection = new sg.SafeguardConnection(hostName);
        let url = connection._constructUrl(sg.Services.APPLIANCE, relativeUrl)
        assert.strictEqual(url, `https://${hostName}/service/appliance/${relativeUrl}`);
    });

    it('ShouldAllowNotificationService', function() {
        let connection = new sg.SafeguardConnection(hostName);
        let url = connection._constructUrl(sg.Services.NOTIFICATION, relativeUrl)
        assert.strictEqual(url, `https://${hostName}/service/notification/${relativeUrl}`);
    });

    it('ShouldAllowA2AService', function() {
        let connection = new sg.SafeguardConnection(hostName);
        let url = connection._constructUrl(sg.Services.A2A, relativeUrl)
        assert.strictEqual(url, `https://${hostName}/service/a2a/${relativeUrl}`);
    });

    it('ShouldAllowParameters', function() {
        let parameters = { "keyOne": "valueOne", "keyTwo": "valueTwo" };

        let connection = new sg.SafeguardConnection(hostName);
        let url = connection._constructUrl(sg.Services.CORE, relativeUrl, parameters)
        assert.strictEqual(url, `https://${hostName}/service/core/${relativeUrl}?keyOne=valueOne&keyTwo=valueTwo`);
    });

    it('ShouldNotAllowBogusService', function() {
        let connection = new sg.SafeguardConnection(hostName);
        assert.throws(() => { connection._constructUrl('bogus', relativeUrl) }, Error);
    });

    it('ShouldNotAllowBadParameters', function() {
        let connection = new sg.SafeguardConnection(hostName);
        assert.throws(() => { connection._constructUrl(sg.Services.Core, relativeUrl, false) }, Error);
    });

    it('SholdNotAllowBearerTokenRetrievalWithoutUserToken', function() {
        let connection = new sg.SafeguardConnection(hostName);
        assert.throws(() => { connection._getBearerToken() }, Error);
    });

    it('ShouldAllowBearerTokenRetrievalWithUserToken', function() {
        let userToken = 'myUserToken';
        sg.Storage = new ls.LocalStorage;
        sg.Storage.setUserToken(userToken);
        let connection = new sg.SafeguardConnection(hostName);
        assert.strictEqual(connection._getBearerToken(), `Bearer ${userToken}`);
    });

    it('ShouldThrowOnInvokeWhenServiceIsNull', async function() {
        let connection = new sg.SafeguardConnection(hostName);
        await assert.rejects(async () => await connection.invoke(null, sg.HttpMethods.GET, 'v3/Me'));
    });

    it('ShouldThrowOnInvokeWhenServiceIsEmpty', async function() {
        let connection = new sg.SafeguardConnection(hostName);
        await assert.rejects(async () => await connection.invoke('', sg.HttpMethods.GET, 'v3/Me'));
    });

    it('ShouldThrowOnInvokeWhenHttpMethodIsNull', async function() {
        let connection = new sg.SafeguardConnection(hostName);
        await assert.rejects(async () => await connection.invoke(sg.Services.CORE, null, 'v3/Me'));
    });

    it('ShouldThrowOnInvokeWhenHttpMethodIsEmpty', async function() {
        let connection = new sg.SafeguardConnection(hostName);
        await assert.rejects(async () => await connection.invoke(sg.Services.CORE, '', 'v3/Me'));
    });

    it('ShouldThrowOnInvokeWhenRelativeUrlIsNull', async function() {
        let connection = new sg.SafeguardConnection(hostName);
        await assert.rejects(async () => await connection.invoke(sg.Services.CORE, sg.HttpMethods.GET, null));
    });

    it('ShouldThrowOnInvokeWhenRelativeUrlIsEmpty', async function() {
        let connection = new sg.SafeguardConnection(hostName);
        await assert.rejects(async () => await connection.invoke(sg.Services.CORE, sg.HttpMethods.GET, ''));
    });

    it('ShouldThrowOnRegisterSignalRWhenCallbackIsNull', async function() {
        let connection = new sg.SafeguardConnection(hostName);
        await assert.rejects(async () => await connection.registerSignalR(null));
    });

    it('ShouldThrowOnRegisterSignalRWhenCallbackIsEmpty', async function() {
        let connection = new sg.SafeguardConnection(hostName);
        await assert.rejects(async () => await connection.registerSignalR(''));
    });

    it('ShouldThrowOnRegisterSignalRWhenNotAuthenticated', async function() {
        sg.Storage = new ls.LocalStorage;
        let connection = new sg.SafeguardConnection(hostName);
        await assert.rejects(async () => await connection.registerSignalR(() => { console.log('something'); }));
    });
});

/*
 * Test connecting via password authentication
 */
describe('ConnectPassword', function() {
    let hostName = 'exampleHostName.local';
    let userName = 'userName';
    let password = 'password';

    it('ShouldThrowWhenHostNameIsNull', async function() {
        await assert.rejects(async () => await sg.connectPassword(null, userName, password));
    });

    it('ShouldThrowWhenHostNameIsEmpty', async function() {
        await assert.rejects(async () => await sg.connectPassword('', userName, password));
    });

    it('ShouldThrowWhenUserNameIsNull', async function() {
        await assert.rejects(async () => await sg.connectPassword(hostName, null, password));
    });

    it('ShouldThrowWhenUserNameIsEmpty', async function() {
        await assert.rejects(async () => await sg.connectPassword(hostName, '', password));
    });

    it('ShouldThrowWhenPasswordIsNull', async function() {
        await assert.rejects(async () => await sg.connectPassword(hostName, userName, null));
    });

    it('ShouldThrowWhenPasswordIsEmpty', async function() {
        await assert.rejects(async () => await sg.connectPassword(hostName, userName, ''));
    });
});

/*
 * Test connecting via anonymous authentication
 */
describe('ConnectAnonymous', function() {
    it('ShouldThrowWhenHostNameIsNull', async function() {
        await assert.rejects(async () => await sg.connectAnonymous(null));
    });

    it('ShouldThrowWhenHostNameIsEmpty', async function() {
        await assert.rejects(async () => await sg.connectAnonymous(''));
    });
});

/*
 * Test connecting via certificate authentication
 */
describe('ConnectCertificate', function() {
    let hostName = 'exampleHostName.local';
    let userCertificateFile = 'userCertificateFile';
    let userCertificateKey = 'userCertificateKey';
    let userCertificatePassphrase = 'userCertificatePassphrase';

    it('ShouldThrowWhenHostNameIsNull', async function() {
        await assert.rejects(async () => await sg.connectCertificate(null, userCertificateFile, userCertificateKey, null, userCertificatePassphrase));
    });

    it('ShouldThrowWhenHostNameIsEmpty', async function() {
        await assert.rejects(async () => await sg.connectCertificate('', userCertificateFile, userCertificateKey, null, userCertificatePassphrase));
    });

    it('ShouldThrowWhenCertsAreAllNull', async function() {
        await assert.rejects(async () => await sg.connectCertificate(hostName, null, null, null, userCertificatePassphrase));
    });

    it('ShouldThrowWhenCertsAreAllEmpty', async function() {
        await assert.rejects(async () => await sg.connectCertificate(hostName, '', '', '', userCertificatePassphrase));
    });

    it('ShouldThrowWhenHostNameIsNull', async function() {
        await assert.rejects(async () => await sg.connectCertificate(hostName, userCertificateFile, userCertificateKey, null, null));
    });

    it('ShouldThrowWhenHostNameIsEmpty', async function() {
        await assert.rejects(async () => await sg.connectCertificate(hostName, userCertificateFile, userCertificateKey, null, ''));
    });
});

/*
 * Test a2a credential retrieval tests
 */
describe('a2aGetCredentialFiles', function() {
    let hostName = 'exampleHostName.local';
    let a2aCertificate = 'userCertificateFile';
    let a2aKey = 'userCertificateKey';
    let a2aKeyPassphrase = 'userCertificatePassphrase';
    let a2aApiKey = 'a2aPasswordApiKey';

    it('ShouldThrowWhenHostNameIsNull', async function() {
        await assert.rejects(async () => await sg.a2aGetCredential(null, a2aApiKey, sg.A2ATypes.PASSWORD, null, a2aCertificate, a2aKey, a2aKeyPassphrase));
    });

    it('ShouldThrowWhenHostNameIsEmpty', async function() {
        await assert.rejects(async () => await sg.a2aGetCredential('', a2aApiKey, sg.A2ATypes.PASSWORD, null, a2aCertificate, a2aKey, a2aKeyPassphrase));
    });

    it('ShouldThrowWhenApiKeyIsNull', async function() {
        await assert.rejects(async () => await sg.a2aGetCredential(hostName, null, sg.A2ATypes.PASSWORD, null, a2aCertificate, a2aKey, a2aKeyPassphrase));
    });

    it('ShouldThrowWhenApiKeyIsEmpty', async function() {
        await assert.rejects(async () => await sg.a2aGetCredential(hostName, '', sg.A2ATypes.PASSWORD, null, a2aCertificate, a2aKey, a2aKeyPassphrase));
    });

    it('ShouldThrowWhenA2ACertIsNull', async function() {
        await assert.rejects(async () => await sg.a2aGetCredential(hostName, a2aApiKey, sg.A2ATypes.PASSWORD, null, null, a2aKey, a2aKeyPassphrase));
    });

    it('ShouldThrowWhenA2ACertIsEmpty', async function() {
        await assert.rejects(async () => await sg.a2aGetCredential(hostName, a2aApiKey, sg.A2ATypes.PASSWORD, null, '', a2aKey, a2aKeyPassphrase));
    });

    it('ShouldThrowWhenA2AKeyIsNull', async function() {
        await assert.rejects(async () => await sg.a2aGetCredential(hostName, a2aApiKey, sg.A2ATypes.PASSWORD, null, a2aCertificate, null, a2aKeyPassphrase));
    });

    it('ShouldThrowWhenA2AKeyIsEmpty', async function() {
        await assert.rejects(async () => await sg.a2aGetCredential(hostName, a2aApiKey, sg.A2ATypes.PASSWORD, null, a2aCertificate, '', a2aKeyPassphrase));
    });

    it('ShouldThrowWhenA2AKeyIsNull', async function() {
        await assert.rejects(async () => await sg.a2aGetCredential(hostName, a2aApiKey, sg.A2ATypes.PASSWORD, null, a2aCertificate, a2aKey, null));
    });

    it('ShouldThrowWhenA2AKeyIsEmpty', async function() {
        await assert.rejects(async () => await sg.a2aGetCredential(hostName, a2aApiKey, sg.A2ATypes.PASSWORD, null, a2aCertificate, a2aKey, ''));
    });
});