# safeguard-js Developer Guide
JavaScript development can be done many ways, this is just one way with Visual Studio Code.

### Requirements
* Install [Visual Studio Code](https://code.visualstudio.com/download)

* Install [Node.js](https://nodejs.org/en/)

* Clone this repository

### Build
* Start Visual Studio Code
* Open root folder of safeguard-js.
* Open a New Terminal and execute the following.
  ```
  npm run build
  ```
  Running the build script does a few things for the Browser samples, but is not needed for Node.JS samples.
    * Runs browserify on `.../src/safeguard.js` output `.../src/safeguardWeb.js`
    * Runs uglifyjs on `.../src/safeguardWeb.js` output `.../src/safeguard.min.js`  
    * Runs uglifyjs on `.../src/safeguardJsAccessTokenChecker.js` output `.../src/safeguardJsAccessTokenChecker.min.js`
    * Removes `.../src/safeguardWeb.js`
    * Copies `.../src/safeguard.min.js` and `.../src/safeguardJsAccessTokenChecker.min.js` to all the Browser samples.

### Test
* From a Terminal excute the following
  ```
  npm test
  ```

### Samples
* Node.JS

  To run any of the Node.JS samples you will need to fill in any of the missing values the scripts need.
  For example `.../samples/Node.JS/passwordExample.js` you will need to fill in caFile, hostname, userName and password.
  ```
  // The trusted root ca of the appliance
  const caFile = '';

  // The appliance host name or IP address
  const hostName = '';

  // The user name for password authentication
  const userName = '';

  // The password for password authentication
  const password = '';
  ```
  
  Once those values you are filled in you can run the example from a JavaScript Debug Terminal.
  ```
  node .\passwordExample.ja
  ```
  Running the script in the JavasScript Debug Terminal will allow you to debug the js file, setting breakpoints, etc.

* Browser
  
  To run any of the Browser samples you will need to serve the pages from a web server.  There are many ways to do this but this is one way through Visual Studio Code.
  
    * Generate your own self signed certificates.  For example if you have openssl setup you can execute a command like the following
      ```
      openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem
      ```
    * Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) Visual Studio Code extension
    * Add the `cert.pem` and `key.pem` files to the Liver Server extension settings Https section.
    * Start Live Server by clicking on the `Go Live` link in the bottom right corner of Visual Studio Code.  
    * Navigate to any of the Browser samples from the launched web page.
