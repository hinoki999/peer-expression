# Peer Expression - start the dev server.
#
# Run this from anywhere. It anchors itself to the repo, applies any
# patch sitting in the folder, makes sure dependencies match, and
# starts Expo. Safe to run repeatedly - every step checks whether it
# is already done.
#
#     powershell -ExecutionPolicy Bypass -File C:\Users\caiti\peer-expression\run.ps1

$ErrorActionPreference = 'Stop'
$repo = 'C:\Users\caiti\peer-expression'
Set-Location $repo

function Step($msg) { Write-Host "`n== $msg" -ForegroundColor Cyan }
function Ok($msg)   { Write-Host "   $msg" -ForegroundColor Green }
function Note($msg) { Write-Host "   $msg" -ForegroundColor Yellow }

Step "Where we are"
$branch = git rev-parse --abbrev-ref HEAD
Ok "branch: $branch"
Ok ("head:   " + (git log --oneline -1))

# --- apply any patch lying in the repo root -------------------------
$patches = Get-ChildItem -Path $repo -Filter '*.patch' -File -ErrorAction SilentlyContinue
foreach ($p in $patches) {
  Step "Found $($p.Name)"
  $dirty = git status --porcelain
  if ($dirty) {
    Note "working tree has uncommitted changes - not applying."
    Note "commit or stash them first, then run this again."
    continue
  }
  git apply --check $p.FullName 2>$null
  if ($LASTEXITCODE -ne 0) {
    Note "already applied (or does not fit this branch) - skipping."
    Remove-Item $p.FullName -Force
    Ok "removed the patch file"
    continue
  }
  git am $p.FullName
  if ($LASTEXITCODE -ne 0) { git am --abort; throw "git am failed on $($p.Name)" }
  Remove-Item $p.FullName -Force
  Ok "applied and removed"
}

# --- dependencies ---------------------------------------------------
Step "Dependencies"
$expoPkg = Join-Path $repo 'node_modules\expo\package.json'
$installedSdk = if (Test-Path $expoPkg) {
  (Get-Content $expoPkg -Raw | ConvertFrom-Json).version
} else { 'none' }
$wantSdk = (Get-Content (Join-Path $repo 'apps\mobile\package.json') -Raw |
            ConvertFrom-Json).dependencies.expo
Ok "installed: $installedSdk   wanted: $wantSdk"

$installedMajor = ($installedSdk -split '\.')[0]
$wantedMajor    = ($wantSdk -replace '[^\d.]','' -split '\.')[0]

if ($installedMajor -ne $wantedMajor) {
  Note "major version differs - wiping node_modules so nothing stale survives"
  Remove-Item -Recurse -Force (Join-Path $repo 'node_modules') -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force (Join-Path $repo 'apps\mobile\node_modules') -ErrorAction SilentlyContinue
  Get-ChildItem (Join-Path $repo 'packages') -Directory | ForEach-Object {
    Remove-Item -Recurse -Force (Join-Path $_.FullName 'node_modules') -ErrorAction SilentlyContinue
  }
}

pnpm install
if ($LASTEXITCODE -ne 0) { throw 'pnpm install failed' }

# --- the gate -------------------------------------------------------
Step "Invariant gate"
pnpm check
if ($LASTEXITCODE -ne 0) { throw 'the gate failed - stopping before the dev server' }

# --- dev server -----------------------------------------------------
Step "Starting Expo"
Note "watch for:  Android Bundled ... (NNNN modules)"
Note "then scan the QR with Expo Go"
Note "if the phone cannot reach the laptop, stop and rerun with:  -Tunnel"
Write-Host ""

$mobile = Join-Path $repo 'apps\mobile'
if ($args -contains '-Tunnel') {
  npx expo start $mobile --clear --go --tunnel
} else {
  npx expo start $mobile --clear --go
}
