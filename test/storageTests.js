var assert = require('assert');
const ls = require('../src/LocalStorage');

describe('LocalStorage', function() {
    let hostName = 'exampleHostName';
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