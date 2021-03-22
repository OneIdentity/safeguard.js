const assert = require('assert');
const ls = require('../src/LocalStorage');
const config = require('./config.js');
const relativeUrl = 'v3/something';

/*
 * Tests for SafeguardConnection
 */
describe('SafeguardConnection', function() {
    let sg = require('../src/safeguard');

    it('ShouldHaveHostNameAfterInitialization', function() {
        let connection = new sg.SafeguardConnection(config.hostName);
        assert.strictEqual(connection.hostName, config.hostName);
    });

    it('ShouldThrowIfHostNameIsNull', function() {
        assert.throws(() => { new sg.SafeguardConnection(null) }, Error);
    });

    it('ShouldThrowIfHostNameIsEmpty', function() {
        assert.throws(() => { new sg.SafeguardConnection('') }, Error);
    });

    it('ShouldAllowCoreService', function() {
        let connection = new sg.SafeguardConnection(config.hostName);
        let url = connection._constructUrl(sg.Services.CORE, relativeUrl)
        assert.strictEqual(url, `https://${config.hostName}/service/core/${relativeUrl}`);
    });

    it('ShouldAllowApplianceService', function() {
        let connection = new sg.SafeguardConnection(config.hostName);
        let url = connection._constructUrl(sg.Services.APPLIANCE, relativeUrl)
        assert.strictEqual(url, `https://${config.hostName}/service/appliance/${relativeUrl}`);
    });

    it('ShouldAllowNotificationService', function() {
        let connection = new sg.SafeguardConnection(config.hostName);
        let url = connection._constructUrl(sg.Services.NOTIFICATION, relativeUrl)
        assert.strictEqual(url, `https://${config.hostName}/service/notification/${relativeUrl}`);
    });

    it('ShouldAllowA2AService', function() {
        let connection = new sg.SafeguardConnection(config.hostName);
        let url = connection._constructUrl(sg.Services.A2A, relativeUrl)
        assert.strictEqual(url, `https://${config.hostName}/service/a2a/${relativeUrl}`);
    });

    it('ShouldAllowParameters', function() {
        let parameters = { "keyOne": "valueOne", "keyTwo": "valueTwo" };

        let connection = new sg.SafeguardConnection(config.hostName);
        let url = connection._constructUrl(sg.Services.CORE, relativeUrl, parameters)
        assert.strictEqual(url, `https://${config.hostName}/service/core/${relativeUrl}?keyOne=valueOne&keyTwo=valueTwo`);
    });

    it('ShouldNotAllowBogusService', function() {
        let connection = new sg.SafeguardConnection(config.hostName);
        assert.throws(() => { connection._constructUrl('bogus', relativeUrl) }, Error);
    });

    it('ShouldNotAllowBadParameters', function() {
        let connection = new sg.SafeguardConnection(config.hostName);
        assert.throws(() => { connection._constructUrl(sg.Services.Core, relativeUrl, false) }, Error);
    });

    it('SholdNotAllowBearerTokenRetrievalWithoutUserToken', function() {
        let connection = new sg.SafeguardConnection(config.hostName);
        assert.throws(() => { connection._getBearerToken() }, Error);
    });

    it('ShouldAllowBearerTokenRetrievalWithUserToken', function() {
        let userToken = 'myUserToken';
        sg.Storage = new ls.LocalStorage;
        sg.Storage.setUserToken(userToken);
        let connection = new sg.SafeguardConnection(config.hostName);
        assert.strictEqual(connection._getBearerToken(), `Bearer ${userToken}`);
    });

    it('ShouldThrowOnInvokeWhenServiceIsNull', async function() {
        let connection = new sg.SafeguardConnection(config.hostName);
        await assert.rejects(async () => await connection.invoke(null, sg.HttpMethods.GET, 'v3/Me'));
    });

    it('ShouldThrowOnInvokeWhenServiceIsEmpty', async function() {
        let connection = new sg.SafeguardConnection(config.hostName);
        await assert.rejects(async () => await connection.invoke('', sg.HttpMethods.GET, 'v3/Me'));
    });

    it('ShouldThrowOnInvokeWhenHttpMethodIsNull', async function() {
        let connection = new sg.SafeguardConnection(config.hostName);
        await assert.rejects(async () => await connection.invoke(sg.Services.CORE, null, 'v3/Me'));
    });

    it('ShouldThrowOnInvokeWhenHttpMethodIsEmpty', async function() {
        let connection = new sg.SafeguardConnection(config.hostName);
        await assert.rejects(async () => await connection.invoke(sg.Services.CORE, '', 'v3/Me'));
    });

    it('ShouldThrowOnInvokeWhenRelativeUrlIsNull', async function() {
        let connection = new sg.SafeguardConnection(config.hostName);
        await assert.rejects(async () => await connection.invoke(sg.Services.CORE, sg.HttpMethods.GET, null));
    });

    it('ShouldThrowOnInvokeWhenRelativeUrlIsEmpty', async function() {
        let connection = new sg.SafeguardConnection(config.hostName);
        await assert.rejects(async () => await connection.invoke(sg.Services.CORE, sg.HttpMethods.GET, ''));
    });

    it('ShouldThrowOnRegisterSignalRWhenCallbackIsNull', async function() {
        let connection = new sg.SafeguardConnection(config.hostName);
        await assert.rejects(async () => await connection.registerSignalR(null));
    });

    it('ShouldThrowOnRegisterSignalRWhenCallbackIsEmpty', async function() {
        let connection = new sg.SafeguardConnection(config.hostName);
        await assert.rejects(async () => await connection.registerSignalR(''));
    });

    it('ShouldThrowOnRegisterSignalRWhenNotAuthenticated', async function() {
        sg.Storage = new ls.LocalStorage;
        let connection = new sg.SafeguardConnection(config.hostName);
        await assert.rejects(async () => await connection.registerSignalR(() => { console.log('something'); }));
    });
});