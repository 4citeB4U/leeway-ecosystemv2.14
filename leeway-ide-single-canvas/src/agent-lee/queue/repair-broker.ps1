<#
LEEWAY_HEADER - DO NOT REMOVE

REGION: DATA
TAG: CORE.AGENT_LEE.QUEUE.REPAIR_BROKER
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
#>

param(
  [int]$MaxWorkers = 2,
  [int]$MaxAttempts = 3
)

$Root = "$HOME\.leeway-vscode"
$QueueFile = "$Root\agent-lee\queue\repair-queue.json"
$HealScript = "$Root\agent-lee\self-heal\self-heal.ps1"
$Log = "$Root\logs\daily\repair-broker.log"

function Load-Queue {
  return Get-Content $QueueFile -Raw | ConvertFrom-Json
}

function Save-Queue($q) {
  $q | ConvertTo-Json -Depth 10 | Set-Content $QueueFile
}

function Add-Log($msg) {
  Add-Content $Log "[$(Get-Date)] $msg"
}

function Run-Worker($task) {
  Add-Log "Worker started for task $($task.id)"

  try {
    & $HealScript -MaxAttempts $MaxAttempts
    $task.status = "completed"
    Add-Log "Task $($task.id) completed"
  } catch {
    $task.status = "failed"
    Add-Log "Task $($task.id) failed"
  }

  return $task
}

while ($true) {

  $q = Load-Queue

  # Move waiting → active
  while ($q.queue.Count -gt 0 -and $q.active.Count -lt $MaxWorkers) {
    $task = $q.queue[0]
    $q.queue = $q.queue[1..($q.queue.Count-1)]
    $task.status = "active"
    $q.active += $task
  }

  # Process active tasks
  $newActive = @()

  foreach ($task in $q.active) {
    if ($task.status -eq "active") {
      $result = Run-Worker $task

      if ($result.status -eq "completed") {
        $q.completed += $result
      } else {
        $q.failed += $result
      }
    } else {
      $newActive += $task
    }
  }

  $q.active = $newActive

  Save-Queue $q

  Start-Sleep -Seconds 10
}

