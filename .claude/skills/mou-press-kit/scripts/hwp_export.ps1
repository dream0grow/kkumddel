# 한글(한컴오피스) 자동화로 HWPX 원본을 열어 .hwpx / .hwp / .pdf 로 다시 저장한다.
# 한글이 줄 배치를 다시 계산하므로, build_kit.py가 만든 *_raw.hwpx는 반드시 이 단계를 거친다.
#
# 사용법: powershell -NoProfile -ExecutionPolicy Bypass -File hwp_export.ps1 <원본.hwpx> <결과 경로(확장자 없이)> [-Formats hwpx,hwp,pdf] [-TimeoutSec 90]
# 출력: pages=<쪽수> 와 저장 결과. 한글이 대화상자로 멈추면 시간 초과 후 Hwp 프로세스를 끝낸다.
param(
  [Parameter(Mandatory=$true)][string]$Src,
  [Parameter(Mandatory=$true)][string]$Base,
  [string[]]$Formats = @("hwpx","hwp","pdf"),
  [int]$TimeoutSec = 90
)
$job = Start-Job -ScriptBlock {
  param($Src,$Base,$Formats)
  $h = New-Object -ComObject HWPFrame.HwpObject
  try { $h.RegisterModule("FilePathCheckDLL","FilePathCheckerModule") | Out-Null } catch {}
  $h.SetMessageBoxMode(0x00020021) | Out-Null
  $fmtIn = if ($Src.ToLower().EndsWith(".hwpx")) { "HWPX" } else { "" }
  if (-not $h.Open($Src,$fmtIn,"forceopen:true")) { "open=False"; $h.Quit(); return }
  "pages=" + $h.PageCount
  foreach ($f in $Formats) {
    $ok = $h.SaveAs("$Base.$f", $f.ToUpper(), "")
    "$f=" + $ok
  }
  $h.Clear(1); $h.Quit()
} -ArgumentList $Src,$Base,$Formats
if (Wait-Job $job -Timeout $TimeoutSec) { Receive-Job $job }
else {
  "TIMEOUT"
  Stop-Job $job
  Get-Process Hwp -ErrorAction SilentlyContinue | Stop-Process -Force
}
Remove-Job $job -Force
