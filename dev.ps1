browserify src/safeguard.js --standalone SafeguardJs > src/safeguardweb.js

foreach ($dir in Get-ChildItem -Path samples/browser){
   copy src/safeguardweb.js samples/browser/$dir
   copy src/safeguardJsAccessTokenChecker.js samples/browser/$dir
}