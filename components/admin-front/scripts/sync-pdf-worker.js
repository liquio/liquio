const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const workerCandidates = [
  path.join(
    projectRoot,
    'node_modules',
    'react-pdf',
    'node_modules',
    'pdfjs-dist',
    'build',
    'pdf.worker.min.js'
  ),
  path.join(projectRoot, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.js'),
];
const targetDir = path.join(projectRoot, 'public', 'js', 'pdfjs');
const target = path.join(targetDir, 'pdf.worker.min.js');

const source = workerCandidates.find((candidate) => fs.existsSync(candidate));

if (!source) {
  throw new Error(`pdfjs worker not found in candidates: ${workerCandidates.join(', ')}`);
}

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(source, target);

console.log(`Synced pdf.js worker from ${source} to ${target}`);
