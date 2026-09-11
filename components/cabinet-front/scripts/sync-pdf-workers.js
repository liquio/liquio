const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

const copies = [
  {
    source: path.join(
      projectRoot,
      'node_modules',
      'react-pdf',
      'node_modules',
      'pdfjs-dist',
      'build',
      'pdf.worker.min.js'
    ),
    target: path.join(projectRoot, 'public', 'js', 'pdfjs', 'pdf.worker.min.js')
  },
  {
    source: path.join(
      projectRoot,
      'node_modules',
      'pdfjs-dist',
      'build',
      'pdf.worker.min.mjs'
    ),
    target: path.join(projectRoot, 'public', 'js', 'pdfjsLib', 'pdf.worker.min.mjs')
  }
];

for (const { source, target } of copies) {
  if (!fs.existsSync(source)) {
    throw new Error(`pdf.js worker not found: ${source}`);
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);

  console.log(`Synced pdf.js worker from ${source} to ${target}`);
}
