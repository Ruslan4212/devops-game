<#
.SYNOPSIS
  Ищет на датасторах .vmdk, которые не подключены ни к одной ВМ или шаблону.
  Ничего не удаляет — только выводит список.

.EXAMPLE
  .\Find-OrphanedVmdk.ps1 -Server vcsa.lab.local
  .\Find-OrphanedVmdk.ps1 -Server vcsa.lab.local -Datastore ds01,ds02 -MinAgeDays 30 -Csv orphans.csv
#>
param(
    [Parameter(Mandatory)][string]$Server,
    [string[]]$Datastore,          # проверить только эти датасторы
    [int]$MinAgeDays = 0,          # только диски, не менявшиеся N дней
    [string]$Csv                   # сохранить результат в CSV
)

# самоподписанный сертификат VCSA
Set-PowerCLIConfiguration -InvalidCertificateAction Ignore -Scope Session -Confirm:$false | Out-Null
Connect-VIServer -Server $Server -ErrorAction Stop | Out-Null

# 1. Все файлы дисков, которые заняты ВМ и шаблонами (включая снапшоты и linked clone)
$used = New-Object 'System.Collections.Generic.HashSet[string]'
Get-View -ViewType VirtualMachine -Property Name, Config.Hardware.Device, LayoutEx.File | ForEach-Object {
    foreach ($f in $_.LayoutEx.File) {
        if ($f.Type -in 'diskDescriptor', 'diskExtent') { [void]$used.Add($f.Name) }
    }
    if (-not $_.Config) { Write-Warning "ВМ $($_.Name) без конфигурации (inaccessible) — её диски могут попасть в список" }
    foreach ($dev in $_.Config.Hardware.Device) {
        if ($dev -isnot [VMware.Vim.VirtualDisk]) { continue }
        $b = $dev.Backing
        while ($b) {                               # текущий диск + цепочка родителей
            if ($b.FileName) { [void]$used.Add($b.FileName) }
            $b = $b.Parent
        }
    }
}
Write-Host "Дисков, занятых ВМ: $($used.Count)"

# 2. Обходим датасторы и ищем .vmdk, которых нет в списке занятых
$spec = New-Object VMware.Vim.HostDatastoreBrowserSearchSpec
$spec.MatchPattern = @('*.vmdk')
$query = New-Object VMware.Vim.VmDiskFileQuery
$query.Details = New-Object VMware.Vim.VmDiskFileQueryFlags -Property @{ CapacityKb = $true; DiskType = $true; Thin = $true }
$spec.Query = @($query)   # API сам скрывает -flat/-delta, fileSize уже включает данные диска
$spec.Details = New-Object VMware.Vim.FileQueryFlags -Property @{ FileSize = $true; FileType = $true; Modification = $true }

$orphans = foreach ($ds in Get-View -ViewType Datastore -Property Name, Browser, Summary.Accessible) {
    if ($Datastore -and $ds.Name -notin $Datastore) { continue }
    if (-not $ds.Summary.Accessible) { Write-Warning "$($ds.Name) недоступен — пропущен"; continue }
    Write-Host "Сканирую $($ds.Name) ..."

    $browser = Get-View $ds.Browser
    foreach ($folder in $browser.SearchDatastoreSubFolders("[$($ds.Name)]", $spec)) {
        $dir = $folder.FolderPath.TrimEnd('/')
        # скрытые служебные папки: .snapshot (NetApp), .sdd.sf, .vSphere-HA и т.п.
        if ($dir -match '[\] /]\.') { continue }

        foreach ($file in $folder.File) {
            $path = if ($dir.EndsWith(']')) { "$dir $($file.Path)" } else { "$dir/$($file.Path)" }
            if ($used.Contains($path)) { continue }

            $age = [int]((Get-Date) - $file.Modification).TotalDays
            if ($age -lt $MinAgeDays) { continue }

            $note = if ($path -match '\] fcd/') { 'FCD (Kubernetes PV?) — проверь в CNS' }
                    elseif ($path -match 'contentlib-') { 'Content Library' }

            [pscustomobject]@{
                Datastore  = $ds.Name
                Path       = $path
                SizeGB     = [math]::Round($file.FileSize / 1GB, 2)
                CapacityGB = [math]::Round($file.CapacityKb / 1MB, 2)
                Thin       = $file.Thin
                Modified   = $file.Modification
                AgeDays    = $age
                Note       = $note
            }
        }
    }
}

$orphans = $orphans | Sort-Object SizeGB -Descending
$orphans | Format-Table Datastore, SizeGB, AgeDays, Path, Note -AutoSize
Write-Host ("Найдено: {0} дисков, {1} GB" -f @($orphans).Count, [math]::Round(($orphans | Measure-Object SizeGB -Sum).Sum, 2))

if ($Csv) { $orphans | Export-Csv $Csv -NoTypeInformation -Encoding UTF8; Write-Host "CSV: $Csv" }

Disconnect-VIServer -Server $Server -Confirm:$false
