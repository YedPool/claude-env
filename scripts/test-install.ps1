# Exercise claude/install.ps1 against a SANDBOX home, not the real ~/.claude.
# install.ps1 derives its target from $env:USERPROFILE, so overriding that in this
# child process is enough to contain it entirely.

$ErrorActionPreference = 'Stop'
$sandbox = Join-Path $env:TEMP ("claudeenv-install-" + [guid]::NewGuid().ToString("N").Substring(0,8))
New-Item -ItemType Directory -Force -Path $sandbox | Out-Null
$env:USERPROFILE = $sandbox

# Resolve the repo from THIS script's own location, so the test runs from any checkout
# rather than only the one it happened to be written in.
$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$repo = Join-Path $repoRoot "claude"
$fail = 0
function Check($cond, $msg) {
    if ($cond) { Write-Host "  ok   $msg" } else { Write-Host "  FAIL $msg" -ForegroundColor Red; $script:fail++ }
}

Write-Host "`ninstalling into sandbox: $sandbox"
& powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repo 'install.ps1') *>&1 |
    Select-String -Pattern 'install\]|error|Exception' | Select-Object -First 20 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }

$claudeDir = Join-Path $sandbox ".claude"

Write-Host "`nresults"
Check (Test-Path (Join-Path $claudeDir "settings.json")) "settings.json was written"

$raw = Get-Content -Raw (Join-Path $claudeDir "settings.json")
$parsed = $null
try { $parsed = $raw | ConvertFrom-Json; Check $true "settings.json is valid JSON" }
catch { Check $false "settings.json is valid JSON -- $_" }

if ($parsed) {
    Check ($parsed.env.CLAUDE_CODE_ENABLE_TODO_TOOLS -eq "1") "todo tools env var is set"
    Check ($parsed.env.CLAUDE_CODE_FORCE_SESSION_PERSISTENCE -eq "1") "session persistence env var is set"
    Check (@($parsed.hooks.Stop[0].hooks).Count -eq 2) "two Stop hooks installed"
    $handoff = @($parsed.hooks.Stop[0].hooks) | Where-Object { "$($_.command)" -like "*run-complete-handoff*" }
    Check ($null -ne $handoff) "the handoff Stop hook is present"
    Check ("$($parsed.hooks.SessionStart[0].hooks[0].command)" -like "*CLAUDE_CODE_CHILD_SESSION*") "SessionStart carries the child-session guard"
    # [A-Z0-9_], not [A-Z_]: a future __FOO2__ would otherwise slip past the guard
    # unsubstituted, and both install.ps1 and the template already allow digits.
    Check (-not ($raw -match '__[A-Z0-9_]+__')) "no unsubstituted placeholders remain"

    # ASSERT ON THE BYTES, not on what Get-Content hands back. `Get-Content -Raw` strips a
    # UTF-8 BOM transparently in PS 5.1, so the "valid JSON" check above passes just as
    # happily on a BOM'd file - it structurally cannot see the defect it appears to cover.
    $bytes = [System.IO.File]::ReadAllBytes((Join-Path $claudeDir "settings.json"))
    $hasBom = ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
    Check (-not $hasBom) "settings.json is written WITHOUT a UTF-8 BOM"

    # And prove the same bytes survive a real JSON.parse, which is the consumer that cares.
    $probe = Join-Path $sandbox "parse.js"
    Set-Content -Path $probe -Encoding ascii -Value "const f=require('fs');try{JSON.parse(f.readFileSync(process.argv[2],'utf8'));console.log('OK');}catch(e){console.log('THREW');}"
    $verdict = & node $probe (Join-Path $claudeDir "settings.json")
    Check ("$verdict" -eq "OK") "node JSON.parse accepts the rendered settings.json"

    # The hook path in settings must point at a file that EXISTS in the installed tree.
    if ($handoff) {
        $cmd = "$($handoff.command)"
        if ($cmd -match '"([^"]+run-complete-handoff\.mjs)"') {
            $hookPath = $Matches[1]
            Check (Test-Path $hookPath) "settings points at a hook file that exists: $hookPath"
        } else { Check $false "could not parse the hook path out of the command" }
    }
}

Check (Test-Path (Join-Path $claudeDir "hooks\run-complete-handoff.mjs")) "the hook was copied into ~/.claude/hooks"
Check (Test-Path (Join-Path $claudeDir "skills\run-complete-handoff\SKILL.md")) "the skill was copied into ~/.claude/skills"
Check (Test-Path (Join-Path $claudeDir "skills\mentor\SKILL.md")) "pre-existing skills still install"

# And the installed hook must actually RUN from where it landed.
$installed = Join-Path $claudeDir "hooks\run-complete-handoff.mjs"
if (Test-Path $installed) {
    $t = Join-Path $sandbox "t.jsonl"
    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add('{"type":"user","message":{"role":"user","content":"go"}}')
    foreach ($i in 1..6) {
      $lines.Add('{"type":"assistant","message":{"content":[{"type":"tool_use","id":"t' + $i + '","name":"Bash","input":{}}]}}')
      $lines.Add('{"type":"user","message":{"content":[{"type":"tool_result","tool_use_id":"t' + $i + '"}]}}')
    }
    Set-Content -Path $t -Value $lines -Encoding utf8
    $payload = '{"hook_event_name":"Stop","transcript_path":"' + ($t -replace '\\','\\') + '","last_assistant_message":"done"}'
    $out = $payload | & node $installed
    Check ("$out" -like '*block*') "CONTROL: the INSTALLED hook blocks on a real run"
    $quiet = '{"hook_event_name":"Stop","stop_hook_active":true,"transcript_path":"' + ($t -replace '\\','\\') + '","last_assistant_message":"done"}'
    $out2 = $quiet | & node $installed
    Check ([string]::IsNullOrWhiteSpace("$out2")) "and stays silent under the loop guard"
}

Remove-Item $sandbox -Recurse -Force -ErrorAction SilentlyContinue
Write-Host ""
if ($fail -gt 0) { Write-Host "FAILED: $fail check(s)" -ForegroundColor Red; exit 1 }
Write-Host "PASSED: all checks" -ForegroundColor Green
exit 0
