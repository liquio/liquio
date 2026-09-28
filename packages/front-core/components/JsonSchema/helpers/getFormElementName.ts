import capitalizeFirstLetter from 'helpers/capitalizeFirstLetter';

export default ({ control, type }: { control?: string; type?: string } = {}): string | null => {
  if (!control && !type) {
    return null;
  }

  const name = control || type + '.element';
  // `.map(capitalizeFirstLetter)` implicitly passes the array index as the
  // second (`onlyFirst`) argument: segment 0 gets the hyphen-aware/lowercasing
  // path (index 0 is falsy), every later dotted segment gets the "capitalize
  // only the first char, leave the rest untouched" path instead — preserved.
  return name.split('.').map((part, index) => capitalizeFirstLetter(part, index as unknown as boolean)).join('');
};
