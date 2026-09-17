// LEEWAY-READONLY-ENDPOINT-CHECK-V1: safe GET availability only, not functional certification.
import fs from 'node:fs';import path from 'node:path';
const root=process.argv[2],dir=path.join(root,'Archive','diagnostics','docker-consolidation-20260916-152552');
const fleet=JSON.parse(fs.readFileSync(path.join(dir,'fleet-after.json')));
const py=JSON.parse(fs.readFileSync(path.join(dir,'running-source-structure.json')));
const js=JSON.parse(fs.readFileSync(path.join(dir,'node-source-structure.json')));
const custom=new Set([...py,...js].map(x=>x.name)),results=[];
for(const c of fleet.containers.filter(c=>c.state==='running'&&custom.has(c.name))){
 const route=({'leeway_digital_brain':'/brain/health','leeway_agent_workstation':'/api/health','leeway-triposr-web':'/'})[c.name]||'/health';
 const candidates=Object.entries(c.ports||{}).filter(([p,v])=>p.endsWith('/tcp')&&v?.length).flatMap(([port,bindings])=>bindings.filter(b=>b.HostIp==='127.0.0.1'||b.HostIp==='0.0.0.0').map(b=>({containerPort:port,hostPort:b.HostPort})));
 if(!candidates.length){results.push({name:c.name,result:'NO_PUBLISHED_TCP_PORT',route});continue}
 const binding=candidates[0];let item={name:c.name,route,...binding};
 try{const response=await fetch('http://127.0.0.1:'+binding.hostPort+route,{signal:AbortSignal.timeout(5000)});item.httpStatus=response.status;item.result=response.ok?'HTTP_RESPONDS':'HTTP_NON_SUCCESS';await response.body?.cancel()}catch(e){item.result='NO_HTTP_RESPONSE';item.error=e.name}
 results.push(item);console.log(c.name+': '+item.result+' '+(item.httpStatus||''));
}
fs.writeFileSync(path.join(dir,'endpoint-checks.json'),JSON.stringify({time:new Date().toISOString(),scope:'GET health availability; does not prove business operations',results},null,2)+'\n');
