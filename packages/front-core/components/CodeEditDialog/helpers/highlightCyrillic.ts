import { cyrillicLetters } from 'helpers/isCyrillic';
import flatten from 'helpers/flatten';

interface AceMarker {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  className: string;
  type: string;
}

interface AceEditorRef {
  current?: { editor?: { session: { doc: { getAllLines: () => string[] } } } } | null;
}

const highlightCyrillic = (aceRef: AceEditorRef, setMarkers: (markers: AceMarker[]) => void) => {
  try {
    setTimeout(() => {
      const editor = aceRef.current?.editor;

      if (!editor) return;

      const lines = editor.session.doc.getAllLines();

      const cyrillic = lines
        .map((line, rowIndex) => {
          const match = line.match(/"([^"]*)"/);

          if (!match) return null;

          const letters = match[1].split('');

          const makers = letters
            .map((letter, i) => {
              const cyrillicLetter = cyrillicLetters(letter);

              if (!cyrillicLetter && letter !== ' ') return null;

              return {
                startRow: rowIndex,
                startCol: Number(i) + Number(match.index) + 1,
                endRow: rowIndex,
                endCol: Number(i) + Number(match.index) + 2,
                className: 'error-marker',
                type: 'background'
              };
            })
            .filter(Boolean) as AceMarker[];

          return makers;
        })
        .filter(Boolean) as AceMarker[][];

      const flatArray = flatten(cyrillic);

      setMarkers(flatArray);
    }, 100);
  } catch (e) {
    console.log('e =>', e);
  }
};

export default highlightCyrillic;
