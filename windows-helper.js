const { execFile } = require('child_process');

function parseClixml(output) {
  if (!output || !output.trim().startsWith('#< CLIXML')) {
    return null;
  }
  const matches = [...output.matchAll(/<S S="Error">([^<]*)<\/S>/g)];
  if (matches.length === 0) {
    return 'PowerShell hata çıktı üretti';
  }
  return matches
    .map(match => match[1].replace(/_x000D__x000A_/g, '\n').trim())
    .filter(Boolean)
    .join('\n');
}

function runPowerShell(script) {
  return new Promise((resolve, reject) => {
    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    execFile(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded],
      { windowsHide: true },
      (error, stdout, stderr) => {
        if (error) {
          const clixml = parseClixml(stdout);
          const message = stderr?.trim() || clixml || error.message;
          const err = new Error(message);
          err.code = error.code;
          return reject(err);
        }
        resolve(stdout);
      }
    );
  });
}

async function getOpenWindows() {
  const script = `
$ErrorActionPreference = 'Stop'
Get-Process |
  Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle } |
  Select-Object @{Name="id";Expression={$_.Id}}, @{Name="title";Expression={$_.MainWindowTitle}} |
  Sort-Object title |
  ConvertTo-Json -Compress
`;

  try {
    const stdout = await runPowerShell(script);
    const trimmed = stdout.trim();
    if (!trimmed) {
      return [];
    }

    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    return [];
  }
}

async function focusWindow(processId) {
  const script = `
$ErrorActionPreference = 'Stop'
$targetPid = ${processId}
$process = Get-Process -Id $targetPid -ErrorAction Stop
if ($process.MainWindowHandle -eq 0) {
  throw 'Window handle yok'
}
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class NativeMethods {
  [DllImport("user32.dll")]
  [return: MarshalAs(UnmanagedType.Bool)]
  public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@
if ([NativeMethods]::SetForegroundWindow($process.MainWindowHandle)) {
  'SUCCESS'
} else {
  throw 'SetForegroundWindow başarısız'
}
`;

  await runPowerShell(script);
  return true;
}

module.exports = { getOpenWindows, focusWindow };
