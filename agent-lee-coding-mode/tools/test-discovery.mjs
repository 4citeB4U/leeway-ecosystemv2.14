import { loadAllLeewayIndex, findModelRole } from '../runtime/discovery-loader.mjs';

(async () => {
  const idx = await loadAllLeewayIndex();
  console.log('Loaded index:', !!idx, 'files:', (idx && (idx.files || idx.length)) || 0);
  const role = await findModelRole(idx, 'deepReasoner');
  console.log('deepReasoner =>', role);
  const hot = await findModelRole(idx, 'hotChat');
  console.log('hotChat =>', hot);
})();
