/**
 *  SafeguardJs
 */
const SafeguardJs = {

    /**
     * (Public) The keys used for storing authentication information.
     */
    SessionStorageKeys: {
        ACCESSTOKEN: 'AccessToken',
        USERTOKEN:   'UserToken',
        HOSTNAME:    'HostName'
    },

    /**
     * (Public) The available services to call on a Safeguard appliance.
     */
    Services: {
        CORE:         'core',
        APPLIANCE:    'appliance',
        NOTIFICATION: 'notification',
        A2A:          'a2a'
    },

    /**
     * (Public) The available HTTP methods.
     */
    HttpMethods: {
        POST:   'post',
        GET:    'get',
        PUT:    'put',
        DELETE: 'delete'
    },

    /**
     * (Internal) Saves the user token to storage.
     *
     * @param {string}              data    String representation of JSON object returned from the
     *                                      Safeguard appliance containing the user token.
     * @param {SafeguardJs.Storage} storage The storage location the user token should be saved to.
     */
    _saveUserToken: (data, storage = new SafeguardJs.Storage) => {
        try {
            let obj = JSON.parse(data);
            if (obj.Status === 'Success') {
                console.log(`Successfully retrieved user token: ${obj.UserToken}`);
                storage.setUserToken(obj.UserToken);
            }
            else {
                throw 'Failed to retrieve user token.';
            }
        }
        catch(ex) {
            throw 'Failed to retrieve user token.';
        }
    },

    /**
     * (Internal) Executes an HTTP request.
     *
     * @param {string}              url         The url of the http request.
     * @param {string}              httpMethod  The HTTP request method.
     * @param {string}              body        The body of the http request.
     * @param {string}              type        The data type of the body of the http request.
     * @param {Object}              headers     The additional headers to be added to the http request.
     * @param {function}            callback    The function to be called with the results of the http request.
     * @param {Object}              returnData  Any additional data that should be included in the callback.
     */
    _execute: (url, httpMethod, body, type, headers, callback, returnData) => {
        $.ajax
        ({
            data:  JSON.stringify(body),
            headers: {
                'accept': 'application/json',
                'accept-language': 'en-US,en;q=0.9',
                'content-type': 'application/json'
            },
            dataType: type,
            url: url,
            method: httpMethod,
            beforeSend: function (xhr) {
                try {
                    // If there are additional headers, add them to the request.
                    // Calling setRequestHeader on an existing key will overwrite the value.
                    if (headers) {
                        for (const [key, value] of Object.entries(headers)) {
                            console.log(`Setting header ${key}: ${value}`);
                            xhr.setRequestHeader(key, value);
                        }
                    }
                }
                catch(ex) {
                    throw `Could not parse the provided headers when attempting to call: ${url}`;
                }
            },
            success: function(data)
            {
                let result = JSON.stringify(data);
                console.log(`Success! - ${result}`);
                if (callback) {
                    callback(result, returnData);
                }
            },
            error: function(data)
            {
                let result = JSON.stringify(data);
                console.log(`Failure! - ${result}`);
                if (callback) {
                    callback(result, returnData);
                }
            }
        });
    },

    /**
     * (Internal) Gets the RSTS URL with a given redirect.
     *
     * @param {string} hostName     The name or ip of the safeguard appliance.
     * @param {string} redirectTo   The redirect URL to be used after successful authentication.
     */
    _loginUrl: (hostName, redirectTo) => {
        return `https://${hostName}/RSTS/Login?response_type=token&redirect_uri=${encodeURIComponent(redirectTo)}`;
    },

    /**
     * (Internal) Redirects the current window to the login page.
     *
     * @param {string} hostName     The name or ip of the safeguard appliance.
     * @param {string} redirectTo   The redirect URL to be used after successful authentication.
     */
    _goToLogin: (hostName, redirectTo) => {
        window.location = SafeguardJs._loginUrl(hostName, redirectTo);
    },

    /**
     * (Internal) Contacts the safeguard appliance to trade an access token for a user token.
     *
     * @param {string}              accessToken The access token to trade.
     * @param {string}              hostName    The name or ip of the safeguard appliance.
     * @param {SafeguardJs.Storage} storage     The storage location of any authentication information.
     */
    _tradeForUserToken: (accessToken, hostName, storage = new SafeguardJs.Storage) => {
        let url = `https://${hostName}/service/core/v3/Token/LoginResponse`;
        body = {
            "StsAccessToken" : accessToken
        }

        SafeguardJs._execute(url, SafeguardJs.HttpMethods.POST, body, "JSON", null, SafeguardJs._saveUserToken, storage, storage);
    },

    /**
     * (Internal) Opens a connection to a Safeguard appliance.
     *
     * This happens in a 3 step process:
     *      1. If no user token or access token is in storage, the getAccessToken function is called.
     *      2. If an access token is in storage, but no user token, the access token is sent to the
     *         safeguard appliance with a request for a user token. Once a user token is secured, a
     *         new SafeguardConnection object is returned.
     *      3. If a user token is in storage, a new SafeguardConnection object is returned.
     *
     * @param {string}              hostName        The name or ip of the safeguard appliance.
     * @param {function}            callback        The function to call with the resultant SafeguardConnection object.
     * @param {SafeguardJs.Storage} storage         The storage location of any authentication information.
     * @param {function}            getAccessToken  The function to call to acquire an access token.
     */
    _connectInternal: (hostName, callback, storage, getAccessToken) => {
        if (hostName == null || hostName === "") {
            throw 'hostName may not be null or empty';
        }

        if (getAccessToken == null) {
            throw 'getAccessToken may not be null or undefined';
        }

        // If we already are connected to a host, check to see if it is the same as
        // what was provided. If not, this needs to be treated as a new connection.
        let storedHostName = storage.getHostName();
        if (storedHostName && hostName !== storedHostName) {
            storage.clearStorage();
        }

        console.log(`Connecting to: ${hostName}`);
        storage.setHostName(hostName);

        let userToken = storage.getUserToken();
        let accessToken = storage.getAccessToken();

        if (userToken) {
            console.log(`Connected with user token: ${userToken}`);
            if (callback) {
                callback(new SafeguardJs.SafeguardConnection(hostName));
            }
        }
        else if (accessToken) {
            console.log(`Connected with access token: ${accessToken}`);
            console.log('Getting user token');
            SafeguardJs._tradeForUserToken(accessToken, hostName);
            if (callback) {
                callback(new SafeguardJs.SafeguardConnection(hostName));
            }
        }
        else {
            getAccessToken();
        }
    },

    /**
     * (Public) Opens a connection to a Safeguard appliance using the RSTS login page.
     *
     * @param {string}              hostName    (Required) The name or ip of the safeguard appliance.
     * @param {string}              redirect    (Required) The redirect URL to be used after successful authentication.
     * @param {function}            callback    (Optional) The function to call with the resultant SafeguardConnection object.
     * @param {SafeguardJs.Storage} storage     (Optional) The storage location of any authentication information.
     */
    connectRsts: (hostName, redirect, callback, storage = new SafeguardJs.Storage) => {
        SafeguardJs._connectInternal(hostName, callback, storage, () => (SafeguardJs._goToLogin(hostName, redirect)));
    },

    /**
     * (Public) Opens a connection to a Safeguard appliance anonymously.
     *
     * @param {string}              hostName    (Required) The name or ip of the safeguard appliance.
     * @param {function}            callback    (Optional) The function to call with the resultant SafeguardConnection object.
     * @param {SafeguardJs.Storage} storage     (Optional) The storage location of any authentication information.
     */
    connectAnonymous: (hostName, callback, storage = new SafeguardJs.Storage) => {
        console.log(`Connecting to: ${hostName}`);
        storage.clearStorage();
        storage.setHostName(hostName);
        callback(new SafeguardJs.SafeguardConnection(hostName));
    },

    /**
     * (Public) Default storage class for SafeguardJs. This uses sessionStorage for storing and
     * retrieving the authentication information for communicating with the safeguard
     * appliance.
     *
     * If implementing a different storage class other than sessionStorage (such as a
     * database), the new class must be written with all of the same methods as those
     * defined here.
     */
    Storage: class Storage {
        /**
         * Gets the access token from storage.
         * @returns {string} The access token.
         */
        getAccessToken() {
            return sessionStorage.getItem(SafeguardJs.SessionStorageKeys.ACCESSTOKEN);
        }

        /**
         * Gets the user token from storage.
         * @returns {string} The user token.
         */
        getUserToken(){
            return sessionStorage.getItem(SafeguardJs.SessionStorageKeys.USERTOKEN);
        }

        /**
         * Gets the host name from storage.
         * @returns {string} The host name.
         */
        getHostName(){
            return sessionStorage.getItem(SafeguardJs.SessionStorageKeys.HOSTNAME);
        }

        /**
         * Writes the access token to storage.
         */
        setAccessToken(accessToken) {
            sessionStorage.setItem(SafeguardJs.SessionStorageKeys.ACCESSTOKEN, accessToken);
        }

        /**
         * Writes the user token to storage.
         */
        setUserToken(userToken) {
            sessionStorage.setItem(SafeguardJs.SessionStorageKeys.USERTOKEN, userToken);
        }

        /**
         * Writes the host name to storage.
         */
        setHostName(hostName) {
            sessionStorage.setItem(SafeguardJs.SessionStorageKeys.HOSTNAME, hostName);
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
    },

    /**
     * (Public) Safeguard connection class for managing the connection to a given
     * safeguard appliance.
     */
    SafeguardConnection: class SafeguardConnection {
        /**
         * Initializes a new instance of the SafeguardConnection class.
         *
         * @param {string} hostName The host name or ip of the Safeguard appliance.
         */
        constructor(hostName) {
            if (hostName == null || hostName === "") {
                throw 'hostName may not be null or empty';
            }
            this.hostName = hostName;
        }

        /**
         * (Private) Constructs the URL for an HTTP request.
         *
         * @param   {SafeguardJs.Services}    service     The Safeguard service the request should be sent to.
         * @param   {string}                  relativeUrl The relative url of the endpoint for the HTTP request.
         * @param   {object}                  paramaters  An object of entries representing any parameters that
         *                                                are to be added to the URL
         * @returns {string} The URL.
         */
        _constructUrl(service, relativeUrl, paramaters) {
            // Define the base URL with the given hostName
            let baseUrl =`https://${this.hostName}/service/`;

            // If any parameters are specified, add and encode them to the relative URL
            try {
                if (paramaters) {
                    let encodeGetParams = p =>
                        Object.entries(p).map(kv => kv.map(encodeURIComponent).join("=")).join("&");

                    relativeUrl = `${relativeUrl}?${encodeGetParams(paramaters)}`;
                }
            }
            catch(ex) {
                throw `Could not process parameters for call to the ${service} service at endpoint ${relativeUrl}.`;
            }

            // Based on the service requested, construct the final URL
            switch(service) {
                case SafeguardJs.Services.CORE:
                    return `${baseUrl}core/${relativeUrl}`;
                    break;
                case SafeguardJs.Services.APPLIANCE:
                    return `${baseUrl}appliance/${relativeUrl}`;
                    break;
                case SafeguardJs.Services.NOTIFICATION:
                    return `${baseUrl}notification/${relativeUrl}`;
                    break;
                case SafeguardJs.Services.A2A:
                    return `${baseUrl}a2a/${relativeUrl}`;
                    break;
                default:
                    throw `Unsupported service requested: ${service}.`;
                    break;
            }
        }

        /**
         * (Private) Creates the bearer token to be used in the authorization header.
         *
         * @param {SafeguardJs.Storage} storage The storage location of any authentication information.
         * @returns {string} The bearer token.
         */
        _getBearerToken(storage = new SafeguardJs.Storage) {
            let userToken = storage.getUserToken();
            if (userToken == null || userToken === "")
            {
                throw 'Access token is missing. Please log in again.';
            }
            return `Bearer ${userToken}`;
        }

        /**
         * (Public) Gets the time remaining (in seconds) of the current access token.
         *
         * @param {function}            callback (Optional) The function to be called with the lifetime remaining result.
         * @param {SafeguardJs.Storage} storage  (Optional) The storage location of any authentication information.
         */
        getAccessTokenLifetimeRemaining(callback, storage = new SafeguardJs.Storage) {
            throw "getAccessTokenLifetimeRemaining is not implemented.";
            let bearerToken = this._getBearerToken(storage);
            let url = this._constructUrl(SafeguardJs.Services.CORE, 'v3/LoginMessage', null);
            let additionalHeaders = {
                'authorization': bearerToken,
                'X-TokenLifetimeRemaining': ''
            }
            SafeguardJs._execute(url, SafeguardJs.HttpMethods.GET, null, "JSON", additionalHeaders, callback, null, storage);
        }

        /**
         * (Public) Logs out a user and clears the storage of authentication information.
         *
         * @param {function}            callback (Optional) The function to be called once the logout has succeeded.
         * @param {SafeguardJs.Storage} storage  (Optional) The storage location of any authentication information.
         */
        logout(callback, storage = new SafeguardJs.Storage) {
            let bearerToken = this._getBearerToken(storage);
            let url = this._constructUrl(SafeguardJs.Services.CORE, 'v3/Token/Logout', null);
            let additionalHeaders = {
                'authorization': bearerToken
            }
            storage.clearStorage();
            SafeguardJs._execute(url, SafeguardJs.HttpMethods.POST, null, "JSON", additionalHeaders, callback, null, storage);
        }

        /**
         * (Public) Invokes an HTTP request.
         *
         * @param {SafeguardJs.Services}    service             (Required) The Safeguard service the request should be sent to.
         * @param {string}                  httpMethod          (Required) The HTTP request method.
         * @param {string}                  relativeUrl         (Required) The relative url of the endpoint for the HTTP request.
         * @param {string}                  body                (Optional) The body of the http request.
         * @param {object}                  paramaters          (Optional) An object of entries representing any parameters that are to be added to the URL
         * @param {Object}                  additionalHeaders   (Optional) The additional headers to be added to the http request.
         * @param {function}                callback            (Optional) The function to be called with the results of the http request.
         * @param {Object}                  returnData          (Optional) Any additional data that should be included in the callback.
         * @param {SafeguardJs.Storage}     storage             (Optional) The storage location of any authentication information.
         */
        invoke(service, httpMethod, relativeUrl, body, parameters, additionalHeaders, callback, returnData, storage = new SafeguardJs.Storage) {
            if (service == null || service === "") {
                throw 'service may not be null or empty';
            }

            if (httpMethod == null || httpMethod === "") {
                throw 'httpMethod may not be null or empty';
            }

            if (relativeUrl == null || relativeUrl === "") {
                throw 'relativeUrl may not be null or empty';
            }

            let userToken = storage.getUserToken();
            if (userToken)
            {
                let bearerToken = this._getBearerToken(storage);
                if (additionalHeaders) {
                    additionalHeaders['authorization'] = bearerToken;
                }
                else {
                    additionalHeaders = {
                        'authorization': bearerToken
                    }
                }
            }

            let url = this._constructUrl(service, relativeUrl, parameters);

            console.log(`Invoking: ${url}`);
            SafeguardJs._execute(url, httpMethod, body, "JSON", additionalHeaders, callback, returnData, storage);
        }
    }
}
