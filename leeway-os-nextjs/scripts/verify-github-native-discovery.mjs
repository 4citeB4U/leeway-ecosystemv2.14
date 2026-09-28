#!/usr/bin/env node
import fs from "node:fs";
const root="leeway-os-nextjs";
const files=[
  root+"/src/lib/kernel-client.ts",
  root+"/src/lib/ecosystem-authority.ts",
  root+"/app/api/leeway/[...route]/route.ts",
  root+"/public/leeway-application.manifest.json"
];
for(const p of files) if(!fs.existsSync(p)) throw new Error("Missing LeeWay OS migration artifact: "+p);
const kernel=fs.readFileSync(files[0],"utf8");
const authority=fs.readFileSync(files[1],"utf8");
const route=fs.readFileSync(files[2],"utf8");
const manifest=JSON.parse(fs.readFileSync(files[3],"utf8"));
const combined=[kernel,authority,route].join("\n");
for(const pattern of [/http:\/\/127\.0\.0\.1/i,/http:\/\/localhost/i,/[DE]:\\\\/i]) {
  if(pattern.test(combined)) throw new Error("Host-bound ecosystem identity remains: "+pattern);
}
for(const token of ["node:child_process", "readFileSync(profilePath"]) {
  if(route.includes(token)) throw new Error("Legacy host-bound discovery remains: "+token);
}
const dockerExec = route.includes('exec("docker"') || route.includes("exec('docker'") || route.includes('execFile("docker"') || route.includes("execFile('docker'");
if(dockerExec) throw new Error("Executable Docker discovery remains in the OS BFF");
if(!authority.includes("LEEWAY_ECOSYSTEM_AUTHORITY_V1")) throw new Error("OS registry client is not bound to canonical Standards registry");
if(!authority.includes("4citeB4U/LeeWay-Standards")) throw new Error("OS registry client missing Standards authority");
if(!route.includes("4citeB4U/LeeWay-Agent-Skills") && !route.includes("open-source-lineage-v1.json")) throw new Error("OS missing open-source provenance route");
if(manifest.applicationId!=="leeway-os") throw new Error("Application manifest identity drift");
if(manifest.repository?.fullName!=="4citeB4U/leeway-ecosystemv2.14") throw new Error("Application repository identity drift");
if(manifest.repository?.commitPolicy!=="SELF_COMMIT_RESOLVED_AT_CONSUMPTION") throw new Error("Application self identity must resolve at consumption");
if(manifest.runtimeBindings?.persistentExecution!=="runtime-fabric") throw new Error("OS persistent execution must bind Runtime Fabric");
if(manifest.runtimeBindings?.deviceExecution!=="device-bridge") throw new Error("OS device execution must bind Device Bridge");
if(manifest.evidence?.formulaExecutionClaim!=="NOT_EXECUTED_BY_APPLICATION_MANIFEST") throw new Error("Application manifest must not claim Formula execution");
console.log(JSON.stringify({state:"PASS_LEEWAY_OS_GITHUB_NATIVE_DISCOVERY",application:manifest.applicationId,repository:manifest.repository.fullName,persistentExecution:manifest.runtimeBindings.persistentExecution,deviceExecution:manifest.runtimeBindings.deviceExecution},null,2));
