// LEEWAY-LIVE-FLEET-AUDIT-V1: read-only runtime inventory; publishes no secret values.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=process.argv[2]; if(!root) throw Error('Verified root required');
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',maxBuffer:32*1024*1024}).trim();
const ids=docker('ps','-aq').split(/\s+/).filter(Boolean);
const all=JSON.parse(docker('inspect',...ids));
const aliases=new Set(all.filter(c=>c.State.Running).flatMap(c=>[c.Name.slice(1),...Object.values(c.NetworkSettings.Networks).flatMap(n=>n.Aliases||[])]));
const shared=new Map(), dependencies=[];
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const containers=all.map(c=>{
 const name=c.Name.slice(1);
 const mounts=c.Mounts.map(m=>{
  const key=m.Type==='volume'?m.Name:m.Source.toLowerCase().replaceAll('\\','/').replace(/^\/run\/desktop\/mnt\/host\/([a-z])\//,'$1:/');
  const sourceId=hash(key);
  if(m.RW){const list=shared.get(sourceId)||[];list.push({container:name,destination:m.Destination});shared.set(sourceId,list)}
  return {type:m.Type,volume:m.Name||null,sourceId,destination:m.Destination,readOnly:!m.RW};
 });
 for(const env of c.Config.Env||[]){
  const index=env.indexOf('='),key=env.slice(0,index),value=env.slice(index+1);
  for(const match of value.matchAll(/(?:https?|wss?):\/\/([A-Za-z0-9_.-]+)/g)){
   const host=match[1];if(/^(leeway|agent[-_]lee)/i.test(host)) dependencies.push({from:name,environmentName:key,to:host,runningAliasPresent:aliases.has(host)});
  }
 }
 let image={};try{image=JSON.parse(docker('image','inspect',c.Image))[0]}catch{}
 return {id:c.Id,name,imageTag:c.Config.Image,imageId:c.Image,repoDigests:image.RepoDigests||[],state:c.State.Status,health:c.State.Health?.Status||'not-configured',restart:c.HostConfig.RestartPolicy.Name,executable:c.Path,workingDirectory:c.Config.WorkingDir,ports:c.NetworkSettings.Ports,networks:Object.entries(c.NetworkSettings.Networks).map(([network,n])=>({network,aliases:n.Aliases||[]})),mounts,environmentNames:(c.Config.Env||[]).map(e=>e.split('=')[0]).sort(),compose:{project:c.Config.Labels?.['com.docker.compose.project']||null,service:c.Config.Labels?.['com.docker.compose.service']||null,sourceExists:(c.Config.Labels?.['com.docker.compose.project.config_files']||'').split(',').filter(Boolean).every(p=>fs.existsSync(p)),sourceLabelPresent:!!c.Config.Labels?.['com.docker.compose.project.config_files']},privileged:c.HostConfig.Privileged,dockerSocketMounted:mounts.some(m=>m.destination==='/var/run/docker.sock')};
});
const result={schema:'leeway.live.fleet.audit.v1',time:new Date().toISOString(),proof:'DIAGNOSTIC_ONLY_NOT_OFFICIAL',counts:{total:containers.length,running:containers.filter(c=>c.state==='running').length,stopped:containers.filter(c=>c.state!=='running').length,healthy:containers.filter(c=>c.health==='healthy').length,unhealthy:containers.filter(c=>c.health==='unhealthy').length,runningWithoutHealthcheck:containers.filter(c=>c.state==='running'&&c.health==='not-configured').length},containers,declaredEnvironmentDependencies:dependencies,sharedWritableMounts:[...shared.entries()].filter(([key,list])=>list.length>1).map(([sourceId,writers])=>({sourceId,writers})),limits:['Environment URLs and literal source hosts are not a complete dynamic dependency graph.','Running and health checks do not prove end-to-end functionality.','Bind source identifiers are hashes; private encrypted configuration retains exact recovery bindings.']};
const dest=path.join(root,'Archive','diagnostics','docker-consolidation-20260916-152552','fleet-after.json');
fs.writeFileSync(dest,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({counts:result.counts,missingDeclaredAliases:dependencies.filter(d=>!d.runningAliasPresent),sharedWritableMountGroups:result.sharedWritableMounts.length,evidence:dest},null,2));
