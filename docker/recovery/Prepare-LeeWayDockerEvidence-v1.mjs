// LEEWAY-PREPARE-DOCKER-EVIDENCE-V1: assemble reviewed, secret-free publication after verified retirement.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const root=process.argv[2],pub=path.join(root,'Archive','tmp','docker-publication-20260916','docker');
const audit=path.join(root,'Archive','diagnostics','docker-consolidation-20260916-152552');
const backup=path.join(root,'Archive','backups','stopped-docker-20260916-154303');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const write=(p,v)=>fs.writeFileSync(p,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');
const fleet=read(path.join(audit,'fleet-after.json')),retired=read(path.join(backup,'retirement-receipt.json'));
if(fleet.counts.stopped!==0||retired.removedCount!==52||retired.status!=='VERIFIED')throw Error('Final verification not complete');
const evidence=path.join(pub,'evidence'),recovery=path.join(pub,'recovery');fs.mkdirSync(recovery,{recursive:true});
for(const file of ['fleet-after.json','running-source-structure.json','node-source-structure.json','runtime-shell-source-audit.json','endpoint-checks.json'])fs.copyFileSync(path.join(audit,file),path.join(evidence,file));
const scriptNames=['Invoke-LeeWayDockerConsolidationDiscovery-v1.ps1','Invoke-LeeWayStoppedDockerPreservation-v1.ps1','Restore-LeeWayPreservedDocker-v1.ps1','Invoke-LeeWayStoppedDockerRetirement-v1.ps1','Invoke-LeeWayBoundedRuntimeRetirement-v1.ps1','Resume-LeeWayBoundedRetirement-v1.ps1','Invoke-LeeWayRunningSourceAudit-v1.ps1','Audit-LeeWayLiveFleet-v1.mjs','Audit-LeeWayNodeSource-v1.mjs','Check-LeeWayReadonlyEndpoints-v1.mjs','Prepare-LeeWayDockerEvidence-v1.mjs'];
for(const file of scriptNames)fs.copyFileSync(path.join(root,'Archive','operator-scripts',file),path.join(recovery,file));
const records=read(path.join(backup,'preservation-manifest.json'));
write(path.join(evidence,'retired-containers.json'),records.map(r=>({id:r.id,name:r.name,originalState:r.originalState,originalImage:r.originalImage,snapshotTag:r.snapshotTag,snapshotImage:r.snapshotImage,backupVerified:r.backupVerified,removed:r.removed,exportSha256:r.exportSha256||null})));
const receiptPaths=['docker-centers-cutover-20260916-153707.json','docker-centers-retirement-20260916-153852.json','skills-cutover-20260916-155520.json','bounded-runtime-retirement-20260916-160111.json','stopped-docker-preservation-20260916-154303.json'];
const allowed=['schema','status','time','proof','formulaExecution','scriptSHA256','removed','removedCount','count','verifiedImageSnapshots','exportFallbacks','archiveSha256','ollamaArchiveSHA256','legacyImageArchiveSHA256','restoreCreateTests','originalVolumesDeleted','volumesDeleted','imagesDeleted','containersStartedByRestoreTests','nativeArchiveReloadVerified','configurationDecryptVerified','modelCount','sortedModelsUnchangedDuringResume','earlierUnsortedComparison','sharedModelStoreRetained'];
const receipts=[];
for(const file of receiptPaths){const bytes=fs.readFileSync(path.join(root,'Archive','receipts',file));const r=read(path.join(root,'Archive','receipts',file));receipts.push({file,privateReceiptSHA256:crypto.createHash('sha256').update(bytes).digest('hex'),...Object.fromEntries(allowed.filter(k=>k in r).map(k=>[k,r[k]]))})}
receipts.push({file:'stopped-container-retirement',...Object.fromEntries(allowed.filter(k=>k in retired).map(k=>[k,retired[k]]))});write(path.join(evidence,'execution-receipts.json'),receipts);
const py=read(path.join(audit,'running-source-structure.json')),js=read(path.join(audit,'node-source-structure.json')),sources=new Map([...py,...js].map(r=>[r.name,r.files]));
const vendorRoles={'leeway-n8n-dev':'Workflow automation server','leeway-seafile-cache':'Seafile cache process','leeway-seafile':'File application; unhealthy, HTTP 502','leeway-seafile-db':'MariaDB; two Seafile databases have no tables','leeway_ollama':'Model serving; 13 model entries retained','leeway-gravitino':'Catalog service with JDBC data store','leeway-bitwarden-lite':'Credential vault service','leeway-forgejo':'Git hosting service','leeway-transit-hub-web':'Static web frontend','leeway-transit-hub-sqlserver-dev':'SQL Server data service','leeway-jitsi-meet-web-1':'Meeting web frontend','leeway-jitsi-meet-jicofo-1':'Conference coordination process','leeway-jitsi-meet-jvb-1':'Media bridge process','leeway-jitsi-meet-prosody-1':'XMPP signaling process'};
const rows=fleet.containers.map(c=>{const files=sources.get(c.name)||[];const routes=[...new Set(files.flatMap(f=>(f.routes||f.routeLiterals||[]).map(r=>r.method.toUpperCase()+' '+r.path)))];const observed=vendorRoles[c.name]||(files.some(f=>f.workOrderOnlyMarker)?'Work-order shell; provider/device execution not implemented':routes.length?routes.slice(0,5).join('; '):'Source structure and process inspected; see linked evidence');return '| '+[c.name,c.health,files.length||'vendor',observed.replaceAll('|','/')].join(' | ')+' |'});
write(path.join(pub,'SERVICE_INVENTORY.md'),'# Running service inventory\n\nSnapshot: '+fleet.time+'. Source routes show implemented interfaces, not successful business workflows. Vendor entries describe image/process roles; their complete operations were not exercised.\n\n| Container | Docker health | Source files inspected | Observed interface or role |\n|---|---|---:|---|\n'+rows.join('\n')+'\n');
const missing=fleet.declaredEnvironmentDependencies.filter(x=>!x.runningAliasPresent);
const blockers=missing.map(x=>'| '+x.from+' | '+x.environmentName+' | '+x.to+' |').join('\n');
const shared=fleet.sharedWritableMounts.map(g=>'- '+g.writers.map(w=>w.container+':'+w.destination).join(' / ')).join('\n');
const report=[
'# LeeWay Docker execution checkpoint - 2026-09-16','',
'Executed on the verified LeeWay workstation through Desktop Commander. This is a diagnostic and recovery checkpoint, not production certification or official C3 ingress proof.','',
'## Completed changes','',
'| Measure | Before | After |','|---|---:|---:|','| Total containers | 106 | '+fleet.counts.total+' |','| Running | 54 | '+fleet.counts.running+' |','| Stopped or created | 52 | '+fleet.counts.stopped+' |','',
'- Consolidated four byte-identical capability-center servers into one container, preserving four identities, ports 8860-8863, registries and 12 legacy network aliases. Their dispatch route acknowledges requests; it does not execute work.',
'- Linked the skills service to the canonical LeeWay-Agent-Skills commit 66c976bb0e79e24503c847ef90929c6fb9d5d818: 100 verified SKILL.md files, eight preserved legacy recipes, persistent local state and read-only live Docker inventory.',
'- Removed the isolated idle Ollama duplicate after image archive reload, shared-volume verification and a stable sorted 13-entry model inventory.',
'- Preserved and removed all 52 original stopped/created containers: 44 image snapshots and eight root-filesystem export fallbacks. Native archive reload and 52 isolated create-without-start tests passed before original deletion.',
'- Retained original volumes and images. No system prune, volume prune, volume deletion, or image deletion was performed. Temporary restore-test anonymous volumes were removed only with their never-started test containers.','',
'## Source and recovery material','',
'[Capability-center source and Compose](capability-centers/README.md), [skills source, pinned submodule and Compose](agent-skills/README.md), [all running services](SERVICE_INVENTORY.md), [execution receipts](evidence/execution-receipts.json), [recovery instructions](recovery/README.md).',
'The source audits cover 27 Python services and nine Node services. They record source hashes, interfaces and dependency clues without importing application code. The inventory also inspects the remaining vendor containers and process/mount/network configuration.',
'This publication is not a complete fresh-machine rebuild of the entire fleet. The two changed applications have source and build recipes; their fresh upstream-base builds and full contract tests passed. Eighteen additional live service sources and reference build contexts are published in recovered-services with provenance; their fresh builds are not verified. Remaining build contexts still require reconciliation. Private filesystem snapshots, secrets and application data are not committed to this public repository.','',
'## Remaining production work','',
'1. Seafile remains unhealthy and returns HTTP 502. MariaDB responds, but ccnet_db and seafile_db have no tables; seahub_db has 100 tables and no auth_user entries. No account creation, schema initialization or destructive database reset was performed. Recovery requires establishing the authoritative data/backup.',
'2. Six running-service environment references have no running alias. Their end-to-end functions are not repaired by container cleanup:',
'','| Source | Setting | Missing endpoint name |','|---|---|---|',blockers,'',
'3. Eight phone/email/calendar/browser/desktop/license/installer/PWA runtimes explicitly state that they are work-order shells, not completed provider/device execution. They are candidates for a shared service after state ownership and client contracts are reconciled.',
'4. '+fleet.counts.runningWithoutHealthcheck+' running containers lack Docker health checks. A successful GET or a green container check does not establish business-workflow correctness.',
'5. Historical C:/E: bindings, relocated Compose labels, and the legacy skills architecture manifest still need source/data reconciliation. The July architecture snapshot was deliberately not promoted to live truth.',
'6. Shared writable mounts remain and need ownership review. Sharing does not by itself prove conflicting writes:',shared,'',
'## Evidence and continuity boundaries','',
'- Correct baseline is 106 containers in docker-consolidation-discovery-20260916-152839.json. Earlier discovery output with a nested-array count of one is superseded, not authoritative.',
'- All 52 original recreation tests passed. Retirement was interrupted by an unavailable backup path; the resume reconciled 11 already absent containers and removed the remaining 41. Two of the prior absences were not recorded in the last saved manifest, so their removal timing is not asserted. Progress was then saved using verified temporary files and replacement backups. An unsorted Ollama comparison failed; its cause was not proven. The resumed operation separately verified sorted model identities and archive reload.',
'- C0 -> C1 -> C2 -> C3 CURRENT -> C4 -> C5 -> C6 remains the continuity path. These direct diagnostics do not establish official C3 completion.',
'- Formula health reported PASS, but Formula selection/execution was NOT_EXECUTED for these maintenance decisions. Learning Ledger was NOT_UPDATED in this maintenance pass.',
'- Root repository unrelated changes were preserved; publication used an isolated checkout and branch.',
''];
write(path.join(pub,'README.md'),report.join('\n'));
console.log(JSON.stringify({publication:pub,counts:fleet.counts,receipts:receipts.length,sourceServices:sources.size}));
