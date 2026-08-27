<#
Fuehrt alle SQL-Migrationen gegen die laufende Docker-Datenbank aus.

Ausfuehrung aus PowerShell:
    .\migrate.ps1
#>

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
$MigrationDir = Join-Path $ScriptDir 'backend\db\migrations'
$Migrations = @(Get-ChildItem -LiteralPath $MigrationDir -Filter '*.sql' -File | Sort-Object Name)

if ($Migrations.Count -eq 0) {
    Write-Host "No migrations found in $MigrationDir"
    exit 0
}

foreach ($Migration in $Migrations) {
    Write-Host "Applying $($Migration.Name) ..."
    Get-Content -LiteralPath $Migration.FullName -Raw -Encoding UTF8 |
        docker compose exec -T db psql --single-transaction -v ON_ERROR_STOP=1 -U $DbUser -d $DbName
    Assert-LastExitCode "Applying $($Migration.Name)"
}

Write-Host "Migrations completed successfully."
