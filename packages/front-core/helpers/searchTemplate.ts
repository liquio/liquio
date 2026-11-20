const phraseRegex = /[+-]?(("(.+?)")|([\wа-яіїґ']+))/gim;

interface ParsedTemplate {
  all: string[];
  any: string[];
  noOne: string[];
}

const makePhraseOrWord = (phrase: string): string => (phrase.indexOf(' ') >= 0 ? '"' + phrase + '"' : phrase);

const phraseOrWord = (phrase: string): string => phrase.split('"').filter(Boolean).join();

export const parseTemplate = (search: string): ParsedTemplate => {
  const all: string[] = [];
  const any: string[] = [];
  const noOne: string[] = [];
  (search.match(phraseRegex) || [])
    .filter((match) => match !== ' ')
    .forEach((match) => {
      switch (match.charAt(0)) {
        case '+':
          all.push(phraseOrWord(match.substr(1)));
          break;
        case '-':
          noOne.push(phraseOrWord(match.substr(1)));
          break;
        default:
          any.push(phraseOrWord(match));
          break;
      }
    });

  return { all, any, noOne };
};

export const strignifyTemplate = ({ all, any, noOne }: ParsedTemplate): string => {
  return ([] as string[])
    .concat(all.map(makePhraseOrWord).map((phrase) => '+' + phrase))
    .concat(any.map(makePhraseOrWord))
    .concat(noOne.map(makePhraseOrWord).map((phrase) => '-' + phrase))
    .join(' ');
};

export default { parseTemplate, strignifyTemplate };
