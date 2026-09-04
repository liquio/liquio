/* eslint-disable no-loop-func */
/* eslint-disable no-undef */
import jsPDF from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import base64ToBlob from 'helpers/base64ToBlob';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'js/pdfjsLib/pdf.worker.min.mjs',
  `${window.location.origin}`
).toString();

async function compressPDF({ attach, outputQuality }) {
  return new Promise((resolve) => {
    const fileReader = new FileReader();
    const resultDocs = [];

    fileReader.onload = async function () {
      try {
        const loadingTask = pdfjsLib.getDocument(fileReader.result);
        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          try {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1 });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d', { alpha: false });

            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);

            await page.render({ canvasContext: context, viewport }).promise;

            const dataUrl = canvas.toDataURL('image/jpeg', outputQuality);

            resultDocs.push({
              index: pageNum,
              dataUrl,
              width: canvas.width,
              height: canvas.height
            });

            canvas.remove();
          } catch (error) {
            console.error(`Page ${pageNum} render error:`, error);
          }
        }

        if (!resultDocs.length) {
          return resolve(attach);
        }

        const first = resultDocs[0];
        const isLandscape = first.width > first.height;

        // eslint-disable-next-line new-cap
        const mergedDoc = new jsPDF({
          orientation: isLandscape ? 'landscape' : 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        const pageWidthMm = isLandscape ? 297 : 210;

        for (let j = 0; j < resultDocs.length; j++) {
          const { dataUrl, width, height } = resultDocs[j];

          const imgWidthMm = pageWidthMm;
          const imgHeightMm = (height * imgWidthMm) / width;

          mergedDoc.addImage(dataUrl, 'JPEG', 0, 0, imgWidthMm, imgHeightMm);

          if (j !== resultDocs.length - 1) {
            mergedDoc.addPage();
          }
        }

        const blob = base64ToBlob(mergedDoc.output('datauristring'));

        blob.labels = attach?.labels;
        blob.path = attach?.path;
        blob.lastModified = attach?.lastModified;
        blob.lastModifiedDate = attach?.lastModifiedDate;
        blob.name = attach?.name;
        blob.origin_type = attach?.type;
        blob.webkitRelativePath = attach?.webkitRelativePath;

        resolve(blob);
      } catch (error) {
        console.error('Merging pdf get error:', error);
        resolve(attach);
      }
    };

    fileReader.readAsArrayBuffer(attach);
  });
}

export default compressPDF;
