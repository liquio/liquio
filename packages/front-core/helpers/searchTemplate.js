const phraseRegex = /[+-]?(("(.+?)")|([\wа-яіїґ']+))/gim;

const makePhraseOrWord = (phrase) => {
  return phrase.indexOf(' ') >= 0 ? '"' + phrase + '"' : phrase;
};

const phraseOrWord = (phrase) => phrase.split('"').filter(Boolean).join();

export const parseTemplate = (search) => {
  const all = [];
  const any = [];
  const noOne = [];
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

export const strignifyTemplate = ({ all, any, noOne }) => {
  return []
    .concat(all.map(makePhraseOrWord).map((phrase) => '+' + phrase))
    .concat(any.map(makePhraseOrWord))
    .concat(noOne.map(makePhraseOrWord).map((phrase) => '-' + phrase))
    .join(' ');
};

export default { parseTemplate, strignifyTemplate };
