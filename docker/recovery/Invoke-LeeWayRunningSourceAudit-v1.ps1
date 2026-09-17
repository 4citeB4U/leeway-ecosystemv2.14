# LEEWAY-RUNNING-SOURCE-AUDIT-V1: read-only source structure, no execution or secrets.
param([string]$LeeWayRoot='D:\LeeWay\Ecosystem')
$ErrorActionPreference='Stop'
$py=@'
import ast,hashlib,json,pathlib,re
out=[]
roots=[pathlib.Path('/app'),pathlib.Path('/srv')]
for root in roots:
 if not root.exists(): continue
 files=list(root.glob('*.py'))+list(root.glob('*/*.py'))+list(root.glob('*/*/*.py'))
 for p in sorted(set(files)):
  if any(s in str(p).lower() for s in ['site-packages','venv','cache','secret','token','credential']): continue
  if p.stat().st_size>1000000: continue
  try:
   b=p.read_bytes(); t=b.decode('utf-8-sig'); tree=ast.parse(t)
   routes=[]; imports=set(); calls=set(); hosts=set()
   for n in ast.walk(tree):
    if isinstance(n,(ast.Import,ast.ImportFrom)):
     imports.update([a.name for a in n.names] if isinstance(n,ast.Import) else [n.module or ''])
    if isinstance(n,ast.Call):
     if isinstance(n.func,ast.Attribute) and n.func.attr in ['get','post','put','delete','patch','websocket'] and n.args and isinstance(n.args[0],ast.Constant) and isinstance(n.args[0].value,str) and n.args[0].value.startswith('/'):
      routes.append({'method':n.func.attr,'path':n.args[0].value})
     if isinstance(n.func,ast.Attribute): calls.add(n.func.attr)
    if isinstance(n,ast.Constant) and isinstance(n.value,str):
     for h in re.findall(r'https?://([A-Za-z0-9_.-]+)(?::[0-9]+)?',n.value): hosts.add(h)
   out.append({'file':str(p),'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b),'routes':routes,'imports':sorted(imports),'callNames':sorted(calls),'literalDependencyHosts':sorted(hosts),'workOrderOnlyMarker':'This runtime shell does not pretend provider/device execution is complete.' in t})
  except Exception as e: out.append({'file':str(p),'error':type(e).__name__})
print(json.dumps(out))
'@
$inventory=Get-Content "$LeeWayRoot\Archive\diagnostics\docker-consolidation-20260916-152552\containers.json" -Raw|ConvertFrom-Json
$names=@($inventory|Where-Object {$_.state -eq 'running' -and ($_.executable -in @('uvicorn','python','sh') -or $_.name -in @('agent-lee-voice-kernel','leeway-triposr-reconstruction'))}|Select-Object -ExpandProperty name)
$result=@()
foreach($name in $names){
 $ErrorActionPreference='Continue'; $raw=$py|docker exec -i $name python - 2>$null; $exit=$LASTEXITCODE; $ErrorActionPreference='Stop'
 if($exit){$ErrorActionPreference='Continue';$raw=$py|docker exec -i $name python3 - 2>$null;$exit=$LASTEXITCODE;$ErrorActionPreference='Stop'}
 $files=@();if(!$exit){$files=$raw|ConvertFrom-Json}
 $result+=@{name=$name;exit=$exit;files=@($files|ForEach-Object{$_})}
 Write-Output ("SOURCE_AUDITED {0}: files={1}, exit={2}" -f $name,@($files).Count,$exit)
}
$dest="$LeeWayRoot\Archive\diagnostics\docker-consolidation-20260916-152552\running-source-structure.json"
[IO.File]::WriteAllText($dest,($result|ConvertTo-Json -Depth 20),(New-Object Text.UTF8Encoding($false)))
Write-Output "EVIDENCE=$dest"
