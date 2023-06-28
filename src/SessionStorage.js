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
        HOSTNAME:    'HostName',
        CODEVERIFIER: 'CodeVerifier',
        RANDOMSTATE: 'RandomState',
        CODE: 'Code',
        STATE: 'State',
        NEWLOGIN: 'NewLogin'
    }

    /**
     * Gets the access token from storage.
     * @returns {string} The access token.
     */
    getAccessToken() {
        return sessionStorage.getItem(this.SessionStorageKeys.ACCESSTOKEN);
    }

    /**
     * Gets the access pkce code from storage.
     * @returns {string} The pkce code.
     */
    getCode() {
        return sessionStorage.getItem(this.SessionStorageKeys.CODE);
    }

    /**
     * Gets the access pkce code verifier from storage.
     * @returns {string} The pkce verifier code.
     */
    getCodeVerifier() {
        return sessionStorage.getItem(this.SessionStorageKeys.CODEVERIFIER);
    }

    /**
     * Gets the access random state from storage.
     * @returns {string} The random state.
     */
    getRandomState() {
        return sessionStorage.getItem(this.SessionStorageKeys.RANDOMSTATE);
    }

    /**
     * Gets the access pkce  state from storage.
     * @returns {string} The pkce state.
     */
    getState() {
        return sessionStorage.getItem(this.SessionStorageKeys.STATE);
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
     * Gets the new login flag from storage.
     * @returns {string} The new login flag.
     */
    getNewLogin(){
        return sessionStorage.getItem(this.SessionStorageKeys.NEWLOGIN);
    }

    /**
     * Writes the access token to storage.
     */
    setAccessToken(accessToken) {
        sessionStorage.setItem(this.SessionStorageKeys.ACCESSTOKEN, accessToken);
    }

    /**
     * Writes the access pkce code to storage.
     */
    setCode(code) {
        sessionStorage.setItem(this.SessionStorageKeys.CODE, code);
    }

    /**
     * Writes the access pkce code verifier to storage.
     */
    setCodeVerifier(codeVerifier) {
        sessionStorage.setItem(this.SessionStorageKeys.CODEVERIFIER, codeVerifier);
    }

    /**
     * Writes the access random state to storage.
     */
    setRandomState(state) {
        sessionStorage.setItem(this.SessionStorageKeys.RANDOMSTATE, state);
    }

    /**
     * Writes the access pkce  state to storage.
     */
    setState(state) {
        sessionStorage.setItem(this.SessionStorageKeys.STATE, state);
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
     * Writes the new login flag to storage.
     */
    setNewLogin(newLogin) {
        sessionStorage.setItem(this.SessionStorageKeys.NEWLOGIN, newLogin);
    }

     /**
      * Clears code and state from storage.
      */
     clearPKCEStorage() {
        sessionStorage.removeItem(this.SessionStorageKeys.CODE);
        sessionStorage.removeItem(this.SessionStorageKeys.STATE);
        sessionStorage.removeItem(this.SessionStorageKeys.CODEVERIFIER);
        sessionStorage.removeItem(this.SessionStorageKeys.RANDOMSTATE);
    }

    /**
     * Clears all values from storage.
     */
    clearStorage() {
        sessionStorage.removeItem(this.SessionStorageKeys.USERTOKEN);
        sessionStorage.removeItem(this.SessionStorageKeys.ACCESSTOKEN);
        sessionStorage.removeItem(this.SessionStorageKeys.HOSTNAME);
        sessionStorage.removeItem(this.SessionStorageKeys.CODE);
        sessionStorage.removeItem(this.SessionStorageKeys.CODEVERIFIER);
        sessionStorage.removeItem(this.SessionStorageKeys.STATE);
        sessionStorage.removeItem(this.SessionStorageKeys.RANDOMSTATE);
        sessionStorage.removeItem(this.SessionStorageKeys.NEWLOGIN);
    }
}

module.exports = { SessionStorage }