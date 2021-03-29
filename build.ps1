browserify .\src\safeguard.js --s SafeguardJs | Out-File -FilePath .\src\safeguardWeb.js -Encoding utf8
uglifyjs --compress --mangle --toplevel .\src\safeguardWeb.js | Out-File -FilePath .\src\safeguard.min.js -Encoding utf8
uglifyjs --compress --mangle --toplevel .\src\safeguardJsAccessTokenChecker.js | Out-File -FilePath .\src\safeguardJsAccessTokenChecker.min.js -Encoding utf8
Remove-Item -Path .\src\safeguardWeb.js

foreach ($dir in Get-ChildItem -Path samples/browser/Promises){
   copy src/safeguard.min.js samples/browser/Promises/$dir
   copy src/safeguardJsAccessTokenChecker.min.js samples/browser/Promises/$dir
}

foreach ($dir in Get-ChildItem -Path samples/browser/Callbacks){
   copy src/safeguard.min.js samples/browser/Callbacks/$dir
   copy src/safeguardJsAccessTokenChecker.min.js samples/browser/Callbacks/$dir
}