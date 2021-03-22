/**
 * (Public) Default storage class for SafeguardJs. This uses sessionStorage for storing and
 * retrieving the authentication information for communicating with the safeguard
 * appliance.
 *
 * If implementing a different storage class other than sessionStorage (such as a
 * database), the new class must be written with all of the same methods as those
 * defined here.
 */
class SessionStorage {
    /**
         * (Public) The keys used for storing authentication information.
         */
    SessionStorageKeys = {
        ACCESSTOKEN: 'AccessToken',
        USERTOKEN:   'UserToken',
        HOSTNAME:    'HostName'
    }

    /**
     * Gets the access token from storage.
     * @returns {string} The access token.
     */
    getAccessToken() {
        return sessionStorage.getItem(this.SessionStorageKeys.ACCESSTOKEN);
    }

    /**
     * Gets the user token from storage.
     * @returns {string} The user token.
     */
    getUserToken(){
        return sessionStorage.getItem(this.SessionStorageKeys.USERTOKEN);
    }

    /**
     * Gets the host name from storage.
     * @returns {string} The host name.
     */
    getHostName(){
        return sessionStorage.getItem(this.SessionStorageKeys.HOSTNAME);
    }

    /**
     * Writes the access token to storage.
     */
    setAccessToken(accessToken) {
        sessionStorage.setItem(this.SessionStorageKeys.ACCESSTOKEN, accessToken);
    }

    /**
     * Writes the user token to storage.
     */
    setUserToken(userToken) {
        sessionStorage.setItem(this.SessionStorageKeys.USERTOKEN, userToken);
    }

    /**
     * Writes the host name to storage.
     */
    setHostName(hostName) {
        sessionStorage.setItem(this.SessionStorageKeys.HOSTNAME, hostName);
    }

    /**
     * Clears all values from storage.
     */
    clearStorage() {
        let userToken = this.getUserToken();
        let accessToken = this.getAccessToken();
        let sessionHostName = this.getHostName();

        if (userToken)
        {
            this.setUserToken('');
        }

        if (accessToken)
        {
            this.setAccessToken('');
        }

        if (sessionHostName)
        {
            this.setHostName('');
        }
    }
}

module.exports = { SessionStorage }