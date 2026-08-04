const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const tmpPath=path.join(root,'tmp_first_script.js');
const htmlPath=path.join(root,'LeeWay-Voice-Scheduling-Translator-CRM','index.html');
const outPath=path.join(root,'tmp_inlined_script_extracted.js');
try{
  const a=fs.readFileSync(tmpPath,'utf8');
  const h=fs.readFileSync(htmlPath,'utf8');
  const startMarker='/* tmp_first_script.js content start */';
  const endMarker='/* tmp_first_script.js content end */';
  if(!h.includes(startMarker)||!h.includes(endMarker)){console.error('Markers not found in index.html'); process.exit(2)}
  const m=h.split(startMarker)[1].split(endMarker)[0];
  // preserve whitespace exactly as in the HTML inlined block
  fs.writeFileSync(outPath,m,'utf8');
  const A=a.replace(/\r\n/g,'\n');
  const B=m.replace(/\r\n/g,'\n');
  if(A===B){console.log('EQUAL'); process.exit(0)}
  console.log('NOT EQUAL');
  const Alines=A.split('\n');
  const Blines=B.split('\n');
  let diffs=0;
  for(let i=0;i<Math.max(Alines.length,Blines.length);i++){
    if(Alines[i]!==Blines[i]){
      diffs++;
      if(diffs<=30){
        console.log('DIFF LINE',i+1);
        console.log('EXPECTED:',Alines[i]===undefined?'<MISSING>':Alines[i]);
        console.log('FOUND:   ',Blines[i]===undefined?'<MISSING>':Blines[i]);
        console.log('---');
      }
    }
  }
  console.log('DIFF_COUNT',diffs);
  process.exit(0);
}catch(e){console.error('ERROR',e.message);process.exit(3)}
