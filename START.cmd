@echo off
setlocal
cd /d "%~dp0"
set "SGS_NODE_EXE="
for /f "delims=" %%N in ('where node 2^>nul') do if not defined SGS_NODE_EXE set "SGS_NODE_EXE=%%N"
if not defined SGS_NODE_EXE for /f "delims=" %%N in ('powershell.exe -NoProfile -Command "$p = Get-AppxPackage -Name 'OpenAI.CodexPrimaryRuntime*' | Sort-Object Version -Descending | Select-Object -First 1; if ($p) { Join-Path $p.InstallLocation 'dependencies\node\bin\node.exe' }"') do set "SGS_NODE_EXE=%%N"
if not defined SGS_NODE_EXE (
  echo Install Node.js 24 LTS from https://nodejs.org/ then run START.cmd again.
  pause
  exit /b 1
)
"%SGS_NODE_EXE%" "%~dp0scripts\start-local.mjs"
if errorlevel 1 pause
