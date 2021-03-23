/**
 * SafeguardJsAccessTokenChecker
 *
 * This is used to check for incoming access tokens from Rsts. Upon successful authentication
 * with Rsts, Rsts will redirect to a given page with the access token as a parameter.  That page
 * needs to have this accessTokenCheck.js file so that the token can be identified, and stored in
 * the appropriate storage location.
 *
 * By default this uses the SafeguardJs.Storage class. If a custom Storage class has been implemented,
 * the check method should be called with the appropriate storage object instead.
 */
const SafeguardJsAccessTokenChecker = {
    /**
     * Gets the access token from the parameters.
     */
    getAccessToken() {
        var index = window.location.href.indexOf("access_token=");
        if (index == -1){
            return null;
        }
        var token = window.location.href.substring(index+13);
        var eindex = token.search(/[&#\/]/);
        if (eindex > -1){
            return token.substring(0, eindex);
        }
        return token;
    },

    /**
     * Checks for and stores an access token in the provided storage location. The page is then redirected
     * to itself omitting the access token parameter.
     * @param {SafeguardJs.Storage} storage The storage location the access token should be saved to.
     */
    check(storage) {
        var token = this.getAccessToken();
        if (token) {
            storage.setAccessToken(token);
            window.location.href = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
        }
    }
}

// Perform the access token check whenever the script is loaded.
SafeguardJsAccessTokenChecker.check(SafeguardJs.Storage);
