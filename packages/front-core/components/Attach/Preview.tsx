import React from 'react';

import PdfDocument from 'components/PDF';
import IMGPreview from 'components/IMG';
import DOCPreview from 'components/DOC';
import HTMLPreviewRaw from 'components/HTMLPreview';
import TextPreview from 'components/TextPreview';
import PreloaderPreview from 'components/PreloaderPreview';
import MediaRaw from 'components/Media';

const Media = MediaRaw as unknown as React.ComponentType<Record<string, unknown>>;
const HTMLPreview = HTMLPreviewRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface PreviewProps {
  doc?: unknown;
  text?: string;
  source?: unknown;
  download?: (...args: unknown[]) => unknown;
  name?: string;
  format?: string;
  url?: string;
  size?: number;
}

export default ({ doc, text, source, download, name, format, url, size }: PreviewProps) => {
  if (!doc && !text) {
    return <PreloaderPreview />;
  }

  if (!source) {
    return <TextPreview text={text as string} />;
  }

  switch (format) {
    case 'pdf':
      return (
        <PdfDocument
          {...({ doc: source, pdf: doc, fileName: name, hideDownload: true } as unknown as Record<string, unknown>)}
        />
      );
    case 'video':
    case 'audio':
      return (
        <Media
          {...({ handleDownload: download, format, name, url } as unknown as Record<string, unknown>)}
        />
      );
    case 'image':
      return (
        <IMGPreview
          {...({ imageUrl: url, fileName: name, handleDownload: download } as unknown as Record<string, unknown>)}
        />
      );
    case 'googleViewDoc':
      return (
        <DOCPreview
          {...({ docUrl: url, fileName: name, handleDownload: download } as unknown as Record<string, unknown>)}
        />
      );
    case 'html':
      return (
        <HTMLPreview
          {...({
            size,
            file: source,
            fileName: name,
            handleDownload: download,
            text
            // url={url}
          } as unknown as Record<string, unknown>)}
        />
      );
    default:
      return (
        <HTMLPreview
          {...({
            size,
            fileName: name,
            handleDownload: download,
            file: doc,
            url: `data:text/html;charset=utf-8,${encodeURI(text as string)}`
          } as unknown as Record<string, unknown>)}
        />
      );
  }
};
