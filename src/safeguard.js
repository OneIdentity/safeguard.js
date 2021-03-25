const FS = require('fs');
const SIGNALR = require('@microsoft/signalr');
const AXIOS = require('axios');
const HTTPS = require('https');
const LS = require('./LocalStorage');
const SS = require('./SessionStorage');

/**
 *  SafeguardJs
 */
const SafeguardJs = {

    hubConnection: SIGNALR.HubConnection,

    CAs: [],

    CAFiles: [],

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
     * (Public) The available A2A credential types.
     */
     A2ATypes: {
        PASSWORD:   'password',
        PRIVATEKEY: 'privatekey'
    },

    /**
     * (Public) The available Ssh key formats.
     */
     SshKeyFormats: {
        OPENSSH:   'openssh',
        SSH2: 'ssh2',
        PUTTY: 'putty'
    },

    /**
     * (Internal) Saves the user token to storage.
     *
     * @param {string}              data    String representation of JSON object returned from the
     *                                      Safeguard appliance containing the user token.
     */
    _saveUserToken: (err, data) => {
        if (err) {
            throw new Error('Failed to save user token.');
        }

        try {
            let obj = JSON.parse(data);
            if (obj.Status === 'Success') {
                SafeguardJs.Storage.setUserToken(obj.UserToken);
            } else {
                throw new Error('Failed to save user token.');
            }
        }
        catch(ex) {
            throw new Error('Failed to save user token.');
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
     * @param {Object}              httpsAgent  (optional) An httpsAgent object. Can be used to specify certificates, as well as other ssl options.
     * @param {bool}                getHeaders  (optional) Flag for whether or not the body or headers of the response should be returned. Defaults to false.
     */
    _execute: (url, httpMethod, body, type, headers, callback, returnData, httpsAgent = null, getHeaders = false) => {
        if (headers) {
            if (!('accept' in headers)) { headers['accept'] = 'application/json'; }
            if (!('accept-language' in headers)) { headers['accept-language'] = 'en-US,en;q=0.9'; }
            if (!('content-type' in headers)) { headers['content-type'] = 'application/json'; }
        } else {
            headers = {
                'accept': 'application/json',
                'accept-language': 'en-US,en;q=0.9',
                'content-type': 'application/json'
            };
        }

        let axios = null;

        if (httpsAgent) {
            axios = AXIOS({
                method: httpMethod,
                url: url,
                headers: headers,
                data: body,
                responseType: type,
                httpsAgent: httpsAgent
            });
        } else {
            axios = AXIOS({
                method: httpMethod,
                url: url,
                headers: headers,
                data: body,
                responseType: type,
                httpsAgent: new HTTPS.Agent({
                    ca: SafeguardJs.CAs
                  })
            });
        }

        axios
        .then(function (response) {
            let result = null;
            if (getHeaders) {
                result = JSON.stringify(response.headers);
            } else {
                result = JSON.stringify(response.data);
            }

            if (callback) {
                callback(null, result, returnData);
            }
        })
        .catch(function (error) {
            let result = null;
            if (error.response && error.response.data) {
                result = JSON.stringify(error.response.data);
            } else {
                result = error.message;
            }            
            if (callback) {
                callback(new Error(result), result, returnData);
            }
        });
    },

    /**
     * (Internal) Executes an HTTP request and returns a promise.
     *
     * @param {string}              url         The url of the http request.
     * @param {string}              httpMethod  The HTTP request method.
     * @param {string}              body        The body of the http request.
     * @param {string}              type        The data type of the body of the http request.
     * @param {Object}              headers     The additional headers to be added to the http request.
     * @param {function}            callback    The function to be called with the results of the http request.
     * @param {Object}              returnData  Any additional data that should be included in the callback.
     * @param {Object}              httpsAgent  (optional) An httpsAgent object. Can be used to specify certificates, as well as other ssl options.
     * @param {bool}                getHeaders  Flag for whether or not the body or headers of the response should be returned.
     */
    _executePromise: (url, httpMethod, body, type, headers, callback, returnData, httpsAgent = null, getHeaders = false) => {
        return new Promise((resolve, reject) => {
            SafeguardJs._execute(url, httpMethod, body, type, headers, (err, data, returnData) => {
                if (callback) {
                    callback(err, data, returnData);
                } else if (err) {
                    reject(err);
                }

                resolve(data);
            }, returnData, httpsAgent, getHeaders);
        });
    },

    /**
     * (Internal) Gets the provider id for a given provider.
     *
     * @param {string}              hostName        (Required) The name or ip of the safeguard appliance.
     * @param {string}              defaultProvider (Required) The id of the default provider.
     * @param {string}              provider        (Optional) The name or id of the provider to use. Default is local.
     */
    _getProviderId: async (hostName, defaultProvider, provider) => {
        if (provider == null || provider === "" || provider.toUpperCase() == "LOCAL" || provider.toUpperCase() == "CERTIFICATE") {
            return defaultProvider;
        }
        
        let headers = {
            "accept": "application/json",
            "content-type": "application/x-www-form-urlencoded"
        }

        let bodyData = {
            "RelayState" : ""
        };

        let result = null;

        try
        {
            result = await SafeguardJs._executePromise(`https://${hostName}/RSTS/UserLogin/LoginController?response_type=token&redirect_uri=urn:InstalledApplication&loginRequestStep=1`, SafeguardJs.HttpMethods.POST, bodyData, 'json', headers);
            result = JSON.parse(result);
        } catch (err) {
            try {
                // Retry as a GET
                result = await SafeguardJs._executePromise(`https://${hostName}/RSTS/UserLogin/LoginController?response_type=token&redirect_uri=urn:InstalledApplication&loginRequestStep=1`, SafeguardJs.HttpMethods.GET, bodyData, 'json', headers);
                result = JSON.parse(result);
            } catch (err) {
                throw new Error(`Could not find the provider: '${provider}'. ${err}`);
            }
        }

        try {
            for (const p of result.Providers) {
                if (provider.toUpperCase() == p.DisplayName.toUpperCase()) {
                    return p.Id;
                } else if (provider.toUpperCase() == p.Id.toUpperCase()) {
                    return p.Id;
                } else if (p.Id.toUpperCase().includes(provider.toUpperCase())) {
                    return p.Id;
                }
            }
        } catch (err) {
            throw new Error(`Could not find the provider: '${provider}'. ${err}`);
        }

        throw new Error(`Could not find the provider: '${provider}'`);
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
     */
    _tradeForUserToken: (accessToken, hostName) => {
        let url = `https://${hostName}/service/core/v3/Token/LoginResponse`;
        body = {
            "StsAccessToken" : accessToken
        }

        SafeguardJs._executePromise(url, SafeguardJs.HttpMethods.POST, body, 'json', null, SafeguardJs._saveUserToken);
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
     * @param {function}            getAccessToken  The function to call to acquire an access token.
     */
    _connectInternal: (hostName, callback, getAccessToken) => {
        if (hostName == null || hostName === "") {
            throw new Error('hostName may not be null or empty');
        }

        if (getAccessToken == null) {
            throw new Error('getAccessToken may not be null or undefined');
        }

        // If we already are connected to a host, check to see if it is the same as
        // what was provided. If not, this needs to be treated as a new connection.
        let storedHostName = SafeguardJs.Storage.getHostName();
        if (storedHostName && hostName !== storedHostName) {
            SafeguardJs.Storage.clearStorage();
        }

        SafeguardJs.Storage.setHostName(hostName);

        let userToken = SafeguardJs.Storage.getUserToken();
        let accessToken = SafeguardJs.Storage.getAccessToken();

        if (userToken) {
            let connection = new SafeguardJs.SafeguardConnection(hostName);
            if (callback) {
                callback(connection);                
            }
            return connection;
        } else if (accessToken) {
            SafeguardJs._tradeForUserToken(accessToken, hostName);
            let connection = new SafeguardJs.SafeguardConnection(hostName);
            if (callback) {
                callback(connection);
            }
            return connection;
        } else {
            getAccessToken();
        }
    },

    /**
     * (Public) Adds a certificate authority to the list of CAs sent with each web request.
     *
     * @param {object}       ca    (Required) The certificate authority to add.
     */
    addCA: (ca) => {
        SafeguardJs.CAs.push(ca);
    },

    /**
     * (Public) Adds a certificate authority to the list of CAs sent with each web request.
     *
     * @param {object}       ca    (Required) The path to the certificate authority file to add.
     */
    addCAFromFile: (caFile) => {
        try {
            let ca = FS.readFileSync(caFile);
            SafeguardJs.addCA(ca);
            SafeguardJs.CAFiles.push(caFile);
        } catch (err) {
            throw new Error(`Failed to add certificate authority: '${caFile}'`);
        }
    },

    /**
     * (Public) Clears the certificate authority list.
     *
     */
    clearCAs: () => {
        SafeguardJs.CAs = [];
        SafeguardJs.CAFiles = [];
    },

    /**
     * (Public) Opens a connection to a Safeguard appliance using the RSTS login page.
     *
     * @param {string}              hostName    (Required) The name or ip of the safeguard appliance.
     * @param {string}              redirect    (Required) The redirect URL to be used after successful authentication.
     * @param {function}            callback    (Optional) The function to call with the resultant SafeguardConnection object.
     * @param {SafeguardJs.Storage} storage     (Optional) The storage location of any authentication information.
     */
    connectRsts: async (hostName, redirect, callback, storage) => {
        if (storage) {
            SafeguardJs.Storage = storage;
        } else {
            SafeguardJs.Storage = new SS.SessionStorage;   
        }

        return SafeguardJs._connectInternal(hostName, callback, () => (SafeguardJs._goToLogin(hostName, redirect)));
    },

    /**
     * (Public) Opens a connection to a Safeguard appliance using a given user name and password.
     *
     * @param {string}              hostName     (Required) The name or ip of the safeguard appliance.
     * @param {string}              userName     (Required) The user name.
     * @param {string}              password     (Required) The password.
     * @param {string}              provider     (Optional) The name of the provider to use. Default is local.
     * @param {function}            callback     (Optional) The function to call with the resultant SafeguardConnection object.
     * @param {SafeguardJs.Storage} storage      (Optional) The storage location of any authentication information.
     */
    connectPassword: async (hostName, userName, password, provider, callback, storage) => {
        if (hostName == null || hostName === "") {
            throw new Error('hostName may not be null or empty');
        }

        if (userName == null || userName === "") {
            throw new Error('userName may not be null or empty');
        }

        if (password == null || password === "") {
            throw new Error('password may not be null or empty');
        }

        let providerId = await SafeguardJs._getProviderId(hostName, 'local', provider);

        if (storage) {
            SafeguardJs.Storage = storage;
        } else {
            SafeguardJs.Storage = new LS.LocalStorage;   
        }
        SafeguardJs.Storage.clearStorage();
        SafeguardJs.Storage.setHostName(hostName);

        try {
            let bodyData = {
                "grant_type" : "password",
                "username" : userName,
                "password" : password,
                "scope" : `rsts:sts:primaryproviderid:${providerId}`
            };
                          
            let accessToken = await SafeguardJs._executePromise(`https://${hostName}/RSTS/oauth2/token`, SafeguardJs.HttpMethods.POST, bodyData, 'json', null, null, null);
            SafeguardJs.Storage.setAccessToken(JSON.parse(accessToken).access_token);
    
            bodyData = {
                "StsAccessToken" : SafeguardJs.Storage.getAccessToken()
              };
    
            let stsToken = await SafeguardJs._executePromise(`https://${hostName}/service/core/v3/Token/LoginResponse`, SafeguardJs.HttpMethods.POST, bodyData, 'json', null, null, null);
            SafeguardJs.Storage.setUserToken(JSON.parse(stsToken).UserToken);
            
            let connection = new SafeguardJs.SafeguardConnection(hostName);
            if (callback) {
                callback(connection);
            }

            return connection;
        } catch (err) {
            throw new Error(err.message);
        }
    },

    /**
     * (Public) Opens a connection to a Safeguard appliance using a given certificate.
     *
     * @param {string}              hostName    (Required) The name or ip of the safeguard appliance.
     * @param {string}              cert        (Required) The user certificate in pem format.
     * @param {string}              key         (Required) The user certificate's key in key format.
     * @param {string}              pfx         (Required) The user certificate in pfx format.
     * @param {string}              passphrase  (Required) The user certificate's passphrase.
     * @param {string}              provider    (Optional) The name of the provider to use. Default is local.
     * @param {function}            callback    (Optional) The function to call with the resultant SafeguardConnection object.
     * @param {SafeguardJs.Storage} storage     (Optional) The storage location of any authentication information.
     */
     connectCertificate: async (hostName, cert, key, pfx, passphrase, provider, callback, storage) => {
        if (hostName == null || hostName === "") {
            throw new Error('hostName may not be null or empty');
        }

        if ((cert == null || cert === "") &&
            (key == null  || key === "") && 
            (pfx == null  || pfx === "")) {
            throw new Error('Either a cert and key or pfx are required.');
        }

        if (passphrase == null || passphrase === "") {
            throw new Error('passphrase may not be null or empty');
        }

        let providerId = await SafeguardJs._getProviderId(hostName, 'certificate', provider);
        
        if (storage) {
            SafeguardJs.Storage = storage;
        } else {
            SafeguardJs.Storage = new LS.LocalStorage;   
        }
        SafeguardJs.Storage.clearStorage();
        SafeguardJs.Storage.setHostName(hostName);

        try {
            let bodyData = {
                "grant_type" : "client_credentials",
                "scope" : `rsts:sts:primaryproviderid:${providerId}`
              };

            let httpsAgent = new HTTPS.Agent({
                cert: cert,
                key: key,
                pfx: pfx,
                ca: SafeguardJs.CAs,
                passphrase: passphrase
              });

            let accessToken = await SafeguardJs._executePromise(`https://${hostName}/RSTS/oauth2/token`, SafeguardJs.HttpMethods.POST, bodyData, 'json', null, null, null, httpsAgent);
            SafeguardJs.Storage.setAccessToken(JSON.parse(accessToken).access_token);
    
            bodyData = {
                "StsAccessToken" : SafeguardJs.Storage.getAccessToken()
              };
    
            let stsToken = await SafeguardJs._executePromise(`https://${hostName}/service/core/v3/Token/LoginResponse`, SafeguardJs.HttpMethods.POST, bodyData, 'json');
            SafeguardJs.Storage.setUserToken(JSON.parse(stsToken).UserToken);
            
            let connection = new SafeguardJs.SafeguardConnection(hostName);
            if (callback) {
                callback(connection);
            }
    
            return connection;
        } catch (err) {
            throw new Error(err.message);
        }
    },

    /**
     * (Public) Opens a connection to a Safeguard appliance using a given certificate.
     *
     * @param {string}              hostName    (Required) The name or ip of the safeguard appliance.
     * @param {string}              certFile    (Required) The user certificate file location in pem format.
     * @param {string}              keyFile     (Required) The user certificate's key file location in key format.
     * @param {string}              pfxFile     (Required) The user certificate in pfx format.
     * @param {string}              passphrase  (Required) The user certificate's passphrase.
     * @param {string}              provider    (Optional) The name of the provider to use. Default is local.
     * @param {function}            callback    (Optional) The function to call with the resultant SafeguardConnection object.
     * @param {SafeguardJs.Storage} storage     (Optional) The storage location of any authentication information.
     */
     connectCertificateFromFiles: async (hostName, certFile, keyFile, pfxFile, passphrase, provider, callback, storage) => {
        let cert = null;
        let key = null; 
        let pfx = null; 

        if (certFile) {
            cert = FS.readFileSync(certFile);
        }
        
        if (keyFile) {
            key = FS.readFileSync(keyFile);
        }

        if (pfxFile) {
            pfx = FS.readFileSync(pfxFile);
        }
        
        return await SafeguardJs.connectCertificate(hostName, cert, key, pfx, passphrase, provider, callback, storage);
     },

    /**
     * (Public) Opens a connection to a Safeguard appliance anonymously.
     *
     * @param {string}              hostName    (Required) The name or ip of the safeguard appliance.
     * @param {function}            callback    (Optional) The function to call with the resultant SafeguardConnection object.
     * @param {SafeguardJs.Storage} storage     (Optional) The storage location of any authentication information.
     */
    connectAnonymous: (hostName, callback, storage) => {
        if (hostName == null || hostName === "") {
            throw new Error('hostName may not be null or empty');
        }

        if (storage) {
            SafeguardJs.Storage = storage;
        } else {
            SafeguardJs.Storage = new SS.SessionStorage;
        }

        SafeguardJs.Storage.clearStorage();
        SafeguardJs.Storage.setHostName(hostName);

        let connection = new SafeguardJs.SafeguardConnection(hostName);
        if (callback) {
            callback(connection);
        }

        return connection;
    },

    /**
     * (Public) Retrieves an application to application credential.
     *
     * @param {string}              hostName    (Required) The name or ip of the safeguard appliance.
     * @param {string}              apiKey      (Required) The a2a api key.
     * @param {string}              type        (Required) The type of credential to retrieve (password, privatekey, etc).
     * @param {string}              cert        (Required) The user certificate in pem format.
     * @param {string}              key         (Required) The user certificate's key in key format.
     * @param {string}              passphrase  (Required) The user certificate's passphrase.
     * @param {function}            callback    (Optional) The function to call with the resultant a2a password.
     */
     a2aGetCredential: async (hostName, apiKey, type, keyFormat, cert, key, passphrase, callback) => {
        if (hostName == null || hostName === "") {
            throw new Error('hostName may not be null or empty');
        }

        if (apiKey == null || apiKey === "") {
            throw new Error('apiKey may not be null or empty');
        }

        if ((cert == null || cert === "") ||
            (key == null  || key === "") ||
            (passphrase == null  || passphrase === "")) {
            throw new Error('A cert and key must be specified.');
        }

        if (!keyFormat) {
            keyFormat = SafeguardJs.SshKeyFormats.OPENSSH;
        }

        try {
            let httpsAgent = new HTTPS.Agent({
                cert: cert,
                key: key,
                ca: SafeguardJs.CAs,
                passphrase: passphrase
              });

            let additionalHeaders = {
                'authorization': `A2A ${apiKey}`
            }

            let credential = await SafeguardJs._executePromise(`https://${hostName}/service/a2a/v2/Credentials?type=${type}&keyFormat=${keyFormat}`, SafeguardJs.HttpMethods.GET, null, 'json', additionalHeaders, null, null, httpsAgent);
            
            // Remove any leading or trailing quotes that were added from string conversion
            if (credential.slice(0, 1) === '"') {
                credential = credential.slice(1);
            }

            if (credential.slice(-1) === '"') {
                credential = credential.slice(0, -1);
            }
            

            if (callback) {
                callback(credential);
            }
    
            return credential;
        } catch (err) {
            throw new Error(`Failed to retrieve credentials: ${err}`);
        }
    },

     /**
     * (Public) Retrieves an application to application credential.
     *
     * @param {string}              hostName    (Required) The name or ip of the safeguard appliance.
     * @param {string}              apiKey      (Required) The a2a api key.
     * @param {string}              type        (Required) The type of credential to retrieve (password, privatekey, etc).
     * @param {string}              certFile    (Required) The user certificate file location in pem format.
     * @param {string}              keyFile     (Required) The user certificate's key file location in key format.
     * @param {string}              passphrase  (Required) The user certificate's passphrase.
     * @param {function}            callback    (Optional) The function to call with the resultant a2a password.
     */
      a2aGetCredentialFromFiles: async (hostName, apiKey, type, keyFormat, certFile, keyFile, passphrase, callback) => {
        let cert = null;
        let key = null;  

        if (certFile) {
            cert = FS.readFileSync(certFile);
        }
        
        if (keyFile) {
            key = FS.readFileSync(keyFile);
        }

        return await SafeguardJs.a2aGetCredential(hostName, apiKey, type, keyFormat, cert, key, passphrase, callback);
      },

    /**
     * 
     */
    Storage: new SS.SessionStorage,

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
                throw new Error('hostName may not be null or empty');
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
            } catch(ex) {
                throw new Error(`Could not process parameters for call to the ${service} service at endpoint ${relativeUrl}.`);
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
                    throw new Error(`Unsupported service requested: '${service}'.`);
                    break;
            }
        }

        /**
         * (Private) Creates the bearer token to be used in the authorization header.
         *
         * @returns {string} The bearer token.
         */
        _getBearerToken() {
            let userToken = SafeguardJs.Storage.getUserToken();
            if (userToken == null || userToken === "")
            {
                throw new Error('Access token is missing. Please log in again.');
            }
            return `Bearer ${userToken}`;
        }

        /**
         * (Public) Gets the time remaining (in seconds) of the current access token.
         *
         * @param {function}            callback (Optional) The function to be called with the lifetime remaining result.
         */
        async getAccessTokenLifetimeRemaining(callback) {
            let bearerToken = this._getBearerToken();
            let url = this._constructUrl(SafeguardJs.Services.CORE, 'v3/LoginMessage', null);
            let additionalHeaders = {
                'authorization': bearerToken,
                'X-TokenLifetimeRemaining': ''
            }
            let result = await SafeguardJs._executePromise(url, SafeguardJs.HttpMethods.GET, null, 'json', additionalHeaders, null, null, null, true);
            result = JSON.parse(result);

            if (callback) {
                callback(result['x-tokenlifetimeremaining']);
            }
            return result['x-tokenlifetimeremaining'];
        }

        /**
         * (Public) Logs out a user and clears the storage of authentication information.
         *
         * @param {function}            callback (Optional) The function to be called once the logout has succeeded.
         */
        async logout(callback) {
            let bearerToken = this._getBearerToken();
            let url = this._constructUrl(SafeguardJs.Services.CORE, 'v3/Token/Logout', null);
            let additionalHeaders = {
                'authorization': bearerToken
            }
            SafeguardJs.Storage.clearStorage();
            let result = await SafeguardJs._executePromise(url, SafeguardJs.HttpMethods.POST, null, 'json', additionalHeaders, callback, null);
            return result;
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
         */
        async invoke(service, httpMethod, relativeUrl, body, parameters, additionalHeaders, callback, returnData) {
            if (service == null || service === "") {
                throw new Error('service may not be null or empty');
            }

            if (httpMethod == null || httpMethod === "") {
                throw new Error('httpMethod may not be null or empty');
            }

            if (relativeUrl == null || relativeUrl === "") {
                throw new Error('relativeUrl may not be null or empty');
            }

            let userToken = SafeguardJs.Storage.getUserToken();
            if (userToken)
            {
                let bearerToken = this._getBearerToken();
                if (additionalHeaders) {
                    additionalHeaders['authorization'] = bearerToken;
                } else {
                    additionalHeaders = {
                        'authorization': bearerToken
                    }
                }
            }

            let url = this._constructUrl(service, relativeUrl, parameters);
            
            try
            {
                let result = await SafeguardJs._executePromise(url, httpMethod, body, 'json', additionalHeaders, callback, returnData);
                return result;
            } catch (err) {
                throw new Error(err.message);
            }
        }

        /**
         * (Public) Registers a callback for SignalR events.
         *
         * @param {function}    callback    (Required) The function to be called for every SignalR event.
         */
        async registerSignalR(callback) {
            let userToken = SafeguardJs.Storage.getUserToken();
            if (userToken == null || userToken === "" || this.hostName == null || this.hostName === "") {
                throw new Error('You must log in before you can register for SignalR events.');
            }

            if (!callback) {
                throw new Error('A callback must be specified to register for SignalR events.');
            }

            // For Node.JS only: The current implementation of SignalR in javascript does not allow for specifying a client certificate in the HubConnectionBuilder.
            // The best way to handle this currently is to add the CA to the global https agent. This requires a file, so SignalR will currently
            // only be supported when the calling script has first used SafeguardJs.addCAFromFile()
            if (SafeguardJs.CAFiles.length != 0) {
                let rootCas = require('ssl-root-cas').create();
                for (const ca of SafeguardJs.CAFiles) {
                    rootCas.addFile(ca);
                }
                require('https').globalAgent.options.ca.concat(rootCas);
            }

            var options = { 
                accessTokenFactory: () => SafeguardJs.Storage.getUserToken()
            };

            SafeguardJs.hubConnection = new SIGNALR.HubConnectionBuilder()
                .withUrl(`https://${this.hostName}/service/event/signalr`, options)
                .build();
            SafeguardJs.hubConnection.on('NotifyEventAsync', function (ev) { if (callback) { callback(ev); } });
            SafeguardJs.hubConnection
                .start()
                .then(() => console.log("SignalR Started!"))
                .catch((error) => console.log(error));
        }
    }
}

module.exports = SafeguardJs;