[CmdletBinding()]
Param(
    [Parameter(Mandatory=$true)][string]$BuildId,
    [Parameter(Mandatory=$true)][string]$TagName,
    [Parameter(Mandatory=$true)][string]$IsTagBuild
)

$SemanticVersion = (node -p "require('./package.json').version").Trim()
$IsTagBuildBool = $IsTagBuild -eq "True" -or $IsTagBuild -eq "true" -or $IsTagBuild -eq "1"

if ($IsTagBuildBool) {
    if ($TagName -notmatch '^v\d+\.\d+\.\d+') {
        Write-Error "Tag '$TagName' does not match 'v<major>.<minor>.<patch>'"
        exit 1
    }
    $PackageVersion = $TagName -replace '^v', ''
} else {
    $BuildNumber = $BuildId % 65534
    $PackageVersion = "${SemanticVersion}-pre${BuildNumber}"
}

npm pkg set version=$PackageVersion
Write-Output "##vso[task.setvariable variable=PackageVersion;]$PackageVersion"

if ($IsTagBuildBool) { $ReleaseTag = $TagName }
else { $ReleaseTag = "dev/v${PackageVersion}" }
Write-Output "##vso[task.setvariable variable=ReleaseTag;]$ReleaseTag"

Write-Host "Version: $PackageVersion"
Write-Host "ReleaseTag: $ReleaseTag"
