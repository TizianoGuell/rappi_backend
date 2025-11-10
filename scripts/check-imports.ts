import { globSync } from 'glob';

function tryImport(file: string) {
  try {
    require(file);
    console.log('OK:', file);
  } catch (e) {
    console.error('ERROR importing', file);
    console.error(e && e.stack ? e.stack : e);
  }
}

const patterns = [
  'src/**\/*.entity.{ts,js}',
  'src/migrations/*.{ts,js}',
  'src/**\/*.module.{ts,js}',
  'src/**\/*.guard.{ts,js}',
];

for (const pat of patterns) {
  const files = globSync(pat, { nodir: true });
  console.log('Pattern', pat, 'found', files.length, 'files');
  for (const f of files) {
    tryImport('./' + f.replace(/\\/g, '/'));
  }
}
