import React from 'react';

import PdfDocument from 'components/PDF';
import IMGPreview from 'components/IMG';
import DOCPreview from 'components/DOC';
import HTMLPreview from 'components/HTMLPreview';
import TextPreview from 'components/TextPreview';
import PreloaderPreview from 'components/PreloaderPreview';
import Media from 'components/Media';

export default ({ doc, text, source, download, name, format, url, size }) => {
  if (!doc && !text) {
    return <PreloaderPreview />;
  }

  if (!source) {
    return <TextPreview text={text} />;
  }

  switch (format) {
    case 'pdf':
      return <PdfDocument doc={source} pdf={doc} fileName={name} hideDownload={true} />;
    case 'video':
    case 'audio':
      return <Media handleDownload={download} format={format} name={name} url={url} />;
    case 'image':
      return <IMGPreview imageUrl={url} fileName={name} handleDownload={download} />;
    case 'googleViewDoc':
      return <DOCPreview docUrl={url} fileName={name} handleDownload={download} />;
    case 'html':
      return (
        <HTMLPreview
          size={size}
          file={source}
          fileName={name}
          handleDownload={download}
          text={text}
          // url={url}
        />
      );
    default:
      return (
        <HTMLPreview
          size={size}
          fileName={name}
          handleDownload={download}
          file={doc}
          url={`data:text/html;charset=utf-8,${encodeURI(text)}`}
        />
      );
  }
};
