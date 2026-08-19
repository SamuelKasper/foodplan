<#
Synchronisiert die Live-Datenbank in die lokale Docker-Datenbank.

Ausführung:
    .\down-sync.ps1
    .\down-sync.ps1 -Force  # ohne lokale Sicherheitsabfrage
#>
param(
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$ScriptDir = $PSScriptRoot
Set-Location $ScriptDir

function Get-DotEnvValue {
    param(
        [Parameter(Mandatory)] [string]$Name,
        [Parameter(Mandatory)] [hashtable]$Values
    )

    if (-not $Values.ContainsKey($Name) -or [string]::IsNullOrWhiteSpace($Values[$Name])) {
        throw "$Name is not set in .env"
    }

    return $Values[$Name]
}

function Assert-LastExitCode {
    param([Parameter(Mandatory)] [string]$Operation)

    if ($LASTEXITCODE -ne 0) {
        throw "$Operation failed (exit code $LASTEXITCODE)."
    }
}

$EnvFile = Join-Path $ScriptDir '.env'
if (-not (Test-Path -LiteralPath $EnvFile -PathType Leaf)) {
    throw ".env was not found at $EnvFile"
}

$EnvValues = @{}
Get-Content -LiteralPath $EnvFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith('#') -and $line -match '^([^=]+)=(.*)$') {
        $EnvValues[$matches[1].Trim()] = $matches[2]
    }
}

$DbUser = Get-DotEnvValue -Name 'DB_USER' -Values $EnvValues
$DbName = Get-DotEnvValue -Name 'DB_NAME' -Values $EnvValues

$ServerUser = if ($env:SERVER_USER) { $env:SERVER_USER } else { 'samu' }
$ServerHost = if ($env:SERVER_HOST) { $env:SERVER_HOST } else { '87.106.19.14' }
$ServerProjectDir = if ($env:SERVER_PROJECT_DIR) { $env:SERVER_PROJECT_DIR } else { '/home/samu/projects/foodplan' }
$ServerDumpDir = if ($env:SERVER_DUMP_DIR) { $env:SERVER_DUMP_DIR } else { '/tmp/foodplan-downsync' }
$Server = "${ServerUser}@${ServerHost}"

$LocalDumpDir = Join-Path $ScriptDir 'dump'
$Timestamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$Filename = "dump_$Timestamp.sql"
$LocalDumpFile = Join-Path $LocalDumpDir $Filename

foreach ($command in 'ssh', 'scp', 'docker') {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
        throw "Required command '$command' was not found."
    }
}

$DockerEndpoint = (docker context inspect --format '{{ .Endpoints.docker.Host }}').Trim()
Assert-LastExitCode 'Checking the Docker context'
if ($DockerEndpoint -notmatch '^npipe://') {
    throw "The active Docker context is not a local Windows Docker Engine ($DockerEndpoint). Switch to a local Docker context before restoring."
}

$null = docker info --format '{{ .ServerVersion }}'
Assert-LastExitCode 'Connecting to the local Docker Engine'

New-Item -ItemType Directory -Path $LocalDumpDir -Force | Out-Null

Write-Host "Creating database dump on $Server ..."
$RemoteScript = @'
set -euo pipefail

project_dir="$1"
dump_dir="$2"
filename="$3"

cd "$project_dir"
umask 077
mkdir -p "$dump_dir"
chmod 700 "$dump_dir"
docker compose exec -T db sh -c 'pg_dump --clean --if-exists -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > "$dump_dir/$filename"
test -s "$dump_dir/$filename"
'@

$RemoteScript | ssh $Server 'bash -s' -- $ServerProjectDir $ServerDumpDir $Filename
Assert-LastExitCode 'Creating the server dump'

Write-Host 'Downloading dump ...'
scp "${Server}:$ServerDumpDir/$Filename" $LocalDumpFile
Assert-LastExitCode 'Downloading the dump'

if (-not (Test-Path -LiteralPath $LocalDumpFile -PathType Leaf) -or (Get-Item -LiteralPath $LocalDumpFile).Length -eq 0) {
    throw "Downloaded dump is missing or empty: $LocalDumpFile"
}

if (-not $Force) {
    $confirmation = Read-Host "This replaces all data in the LOCAL database '$DbName'. Type YES to continue"
    if ($confirmation -cne 'YES') {
        Write-Host 'Cancelled. The downloaded dump was kept.'
        exit 0
    }
}

Write-Host "Restoring dump into local database '$DbName' ..."
Get-Content -LiteralPath $LocalDumpFile -Raw -Encoding UTF8 |
    docker compose exec -T db psql --single-transaction -v ON_ERROR_STOP=1 -U $DbUser -d $DbName
Assert-LastExitCode 'Restoring the local database'

Write-Host "Downsync completed successfully: $LocalDumpFile"
