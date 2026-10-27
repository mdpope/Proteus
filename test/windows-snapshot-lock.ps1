param([Parameter(Mandatory=$true)][string]$Sentinel)
$ErrorActionPreference='Stop'
$stream = [System.IO.File]::Open($Sentinel,[System.IO.FileMode]::Open,[System.IO.FileAccess]::Read,[System.IO.FileShare]::None)
try {
 [Console]::WriteLine('LOCK_READY')
 [Console]::Out.Flush()
 [void][Console]::In.ReadLine()
} finally { $stream.Dispose() }
