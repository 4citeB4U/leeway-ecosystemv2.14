// LEEWAY-NODE-SOURCE-AUDIT-V1: inspect source bytes without importing application code.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=process.argv[2];
const names=['leeway_runtime_fabric','leeway_agent_workstation','agent_lee_code_mode','leeway_hybrid_fabric','leeway-opencode-control-mcp','leeway-triposr-web','leeway_media_router','leeway_media_ingestion_layer','leeway_capability_centers'];
const code=String.raw`
const fs=require('fs'),path=require('path'),crypto=require('crypto');const files=[];
function walk(dir,depth){if(depth>3||files.length>300)return;let entries=[];try{entries=fs.readdirSync(dir,{withFileTypes:true})}catch{return}
for(const e of entries){if(/node_modules|^\.|receipts|logs|secret|credential|cache|state|output|archive|registry|registries/i.test(e.name))continue;const p=path.join(dir,e.name);
if(e.isDirectory())walk(p,depth+1);else if(/\.(?:m?js|cjs|ts)$/.test(p)&&fs.statSync(p).size<1000000){const b=fs.readFileSync(p),t=b.toString('utf8');files.push({file:p,sha256:crypto.createHash('sha256').update(b).digest('hex'),bytes:b.length,routeLiterals:[...t.matchAll(/(?:app|router)\.(get|post|put|delete|patch|use)\(\s*['"]([^'"]+)['"]/g)].map(m=>({method:m[1],path:m[2]})),literalDependencyHosts:[...new Set([...t.matchAll(/https?:\/\/([A-Za-z0-9_.-]+)/g)].map(m=>m[1]))],executionMarkers:['execFile','spawn','fetch(','axios','http.request','writeFile','DISPATCH_ACCEPTED_BY_CENTER_NOT_EXECUTED_DIRECTLY'].filter(m=>t.includes(m))})}
}}
walk('/app',0);console.log(JSON.stringify(files));
`;
const rows=[];
for(const name of names){try{const files=JSON.parse(execFileSync('docker',['exec','-i',name,'node','-'],{input:code,encoding:'utf8',maxBuffer:16*1024*1024}));rows.push({name,files});console.log(name+': '+files.length+' files')}catch{rows.push({name,error:'SOURCE_SCAN_FAILED'})}}
const dest=path.join(root,'Archive','diagnostics','docker-consolidation-20260916-152552','node-source-structure.json');fs.writeFileSync(dest,JSON.stringify(rows,null,2)+'\n');console.log(dest);
