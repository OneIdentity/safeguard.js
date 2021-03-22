/**
 * (Public) Default storage class for NodeJS implementations of SafeguardJS. This
 * uses memory for storing and retrieving the authentication information for
 * communicating with the safeguard appliance.
 *
 * If implementing a different storage class other than LocalStorage (such as a
 * database), the new class must be written with all of the same methods as those
 * defined here.
 */
class LocalStorage {
    constructor() {
        this.hostName = '';
        this.accessToken = '';
        this.userToken = '';
    }

    /**
     * Gets the access token from storage.
     * @returns {string} The access token.
     */
    getAccessToken() {
        return this.accessToken;
    }

    /**
     * Gets the user token from storage.
     * @returns {string} The user token.
     */
    getUserToken(){
        return this.userToken;
    }

    /**
     * Gets the host name from storage.
     * @returns {string} The host name.
     */
    getHostName(){
        return this.hostName;
    }

    /**
     * Writes the access token to storage.
     */
    setAccessToken(accessToken) {
        this.accessToken = accessToken;
    }

    /**
     * Writes the user token to storage.
     */
    setUserToken(userToken) {
        this.userToken = userToken;
    }

    /**
     * Writes the host name to storage.
     */
    setHostName(hostName) {
        this.hostName = hostName;
    }

    /**
     * Clears all values from storage.
     */
    clearStorage() {
        this.setUserToken('');
        this.setAccessToken('');
        this.setHostName('');
    }
}

module.exports = { LocalStorage }