# setup-team-skills.ps1
# Installs shared GovTech Claude Code skills from govtech-bb/team-skills.
# Run once per machine: powershell -ExecutionPolicy Bypass -File setup-team-skills.ps1

$repo     = "https://github.com/govtech-bb/team-skills.git"
$skillsDir = Join-Path $env:USERPROFILE ".claude\commands"
$cloneDir  = Join-Path $env:USERPROFILE ".claude\team-skills"

# Ensure the commands directory exists.
if (-not (Test-Path $skillsDir)) {
    New-Item -ItemType Directory -Force -Path $skillsDir | Out-Null
    Write-Host "Created $skillsDir"
}

# Clone or update the shared skills repo.
if (Test-Path $cloneDir) {
    Write-Host "Updating team skills..."
    git -C $cloneDir pull --ff-only
} else {
    Write-Host "Cloning team skills..."
    git clone $repo $cloneDir
}

# Copy all .md skill files into ~/.claude/commands/
$files = Get-ChildItem -Path $cloneDir -Filter "*.md" -Recurse
if ($files.Count -eq 0) {
    Write-Host "No skill files found in repo."
} else {
    foreach ($file in $files) {
        $dest = Join-Path $skillsDir $file.Name
        Copy-Item -Path $file.FullName -Destination $dest -Force
        Write-Host "Installed: $($file.Name)"
    }
    Write-Host "`nDone. $($files.Count) skill(s) installed to $skillsDir"
    Write-Host "Restart Claude Code to pick up the new skills."
}
