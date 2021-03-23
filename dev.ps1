browserify src/safeguard.js --standalone SafeguardJs > src/safeguardweb.js

foreach ($dir in Get-ChildItem -Path samples/browser/Promises){
   copy src/safeguardweb.js samples/browser/Promises/$dir
   copy src/safeguardJsAccessTokenChecker.js samples/browser/Promises/$dir
}

foreach ($dir in Get-ChildItem -Path samples/browser/Callbacks){
   copy src/safeguardweb.js samples/browser/Callbacks/$dir
   copy src/safeguardJsAccessTokenChecker.js samples/browser/Callbacks/$dir
}