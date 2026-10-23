/**
 * Created by lomaka on 25.09.17.
 */
const entities = {
  amp: '&',
  gt: '>',
  lt: '<',
  quot: '"',
  apos: "'",

  nbsp: '\u00a0',
  iexcl: '¡',
  curren: '¤',
  cent: '¢',
  pound: '£',
  yen: '¥',
  brvbar: '¦',
  sect: '§',
  uml: '¨',
  copy: '©',
  hello: 'there',
  ordf: 'ª',
  laquo: '«',
  not: '¬',
  shy: '­',
  reg: '®',
  trade: '™',
  macr: '¯',
  deg: '°',
  plusmn: '±',
  sup2: '²',
  sup3: '³',
  acute: '´',
  micro: 'µ',
  para: '¶',
  middot: '·',
  cedil: '¸',
  sup1: '¹',
  ordm: 'º',
  raquo: '»',
  frac14: '¼',
  frac12: '½',
  frac34: '¾',
  iquest: '¿',
  times: '×',
  divide: '÷',

  Agrave: 'À',
  Aacute: 'Á',
  Acirc: 'Â',
  Atilde: 'Ã',
  Auml: 'Ä',
  Aring: 'Å',
  AElig: 'Æ',
  Ccedil: 'Ç',
  Egrave: 'È',
  Eacute: 'É',
  Ecirc: 'Ê',
  Euml: 'Ë',
  Igrave: 'Ì',
  Iacute: 'Í',
  Icirc: 'Î',
  Iuml: 'Ï',
  ETH: 'Ð',
  Ntilde: 'Ñ',
  Ograve: 'Ò',
  Oacute: 'Ó',
  Ocirc: 'Ô',
  Otilde: 'Õ',
  Ouml: 'Ö',
  Oslash: 'Ø',
  Ugrave: 'Ù',
  Uacute: 'Ú',
  Ucirc: 'Û',
  Uuml: 'Ü',
  Yacute: 'Ý',
  THORN: 'Þ',
  szlig: 'ß',
  agrave: 'à',
  aacute: 'á',
  acirc: 'â',
  atilde: 'ã',
  auml: 'ä',
  aring: 'å',
  aelig: 'æ',
  ccedil: 'ç',
  egrave: 'è',
  eacute: 'é',
  ecirc: 'ê',
  euml: 'ë',
  igrave: 'ì',
  iacute: 'í',
  icirc: 'î',
  iuml: 'ï',
  eth: 'ð',
  ntilde: 'ñ',
  ograve: 'ò',
  oacute: 'ó',
  ocirc: 'ô',
  otilde: 'õ',
  ouml: 'ö',
  oslash: 'ø',
  ugrave: 'ù',
  uacute: 'ú',
  ucirc: 'û',
  uuml: 'ü',
  yacute: 'ý',
  thorn: 'þ',
  yuml: 'ÿ',

  OElig: 'Œ',
  oelig: 'œ',
  Scaron: 'Š',
  scaron: 'š',
  Yuml: 'Ÿ',
  circ: 'ˆ',
  tilde: '˜',
  ensp: '\u2002',
  emsp: '\u2003',
  thinsp: '\u2009',
  zwnj: '\u200C',
  zwj: '\u200D',
  lrm: '\u200E',
  rlm: '\u200F',
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  sbquo: '‚',
  ldquo: '“',
  rdquo: '”',
  bdquo: '„',
  dagger: '†',
  Dagger: '‡',
  hellip: '…',
  permil: '‰',
  lsaquo: '‹',
  rsaquo: '›',
  euro: '€',

  fnof: 'ƒ',
  Alpha: 'Α',
  Beta: 'Β',
  Gamma: 'Γ',
  Delta: 'Δ',
  Epsilon: 'Ε',
  Zeta: 'Ζ',
  Eta: 'Η',
  Theta: 'Θ',
  Iota: 'Ι',
  Kappa: 'Κ',
  Lambda: 'Λ',
  Mu: 'Μ',
  Nu: 'Ν',
  Xi: 'Ξ',
  Omicron: 'Ο',
  Pi: 'Π',
  Rho: 'Ρ',
  Sigma: 'Σ',
  Tau: 'Τ',
  Upsilon: 'Υ',
  Phi: 'Φ',
  Chi: 'Χ',
  Psi: 'Ψ',
  Omega: 'Ω',
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  epsilon: 'ε',
  zeta: 'ζ',
  eta: 'η',
  theta: 'θ',
  iota: 'ι',
  kappa: 'κ',
  lambda: 'λ',
  mu: 'μ',
  nu: 'ν',
  xi: 'ξ',
  omicron: 'ο',
  pi: 'π',
  rho: 'ρ',
  sigmaf: 'ς',
  sigma: 'σ',
  tau: 'τ',
  upsilon: 'υ',
  phi: 'φ',
  chi: 'χ',
  psi: 'ψ',
  omega: 'ω',
  thetasym: 'ϑ',
  upsih: 'ϒ',
  piv: 'ϖ',
  bull: '•',
  prime: '′',
  Prime: '″',
  oline: '‾',
  frasl: '⁄',
  weierp: '℘',
  image: 'ℑ',
  real: 'ℜ',
  alefsym: 'ℵ',
  larr: '←',
  uarr: '↑',
  rarr: '→',
  darr: '↓',
  harr: '↔',
  crarr: '↵',
  lArr: '⇐',
  uArr: '⇑',
  rArr: '⇒',
  dArr: '⇓',
  hArr: '⇔',
  forall: '∀',
  part: '∂',
  exist: '∃',
  empty: '∅',
  nabla: '∇',
  isin: '∈',
  notin: '∉',
  ni: '∋',
  prod: '∏',
  sum: '∑',
  minus: '−',
  lowast: '∗',
  radic: '√',
  prop: '∝',
  infin: '∞',
  ang: '∠',
  and: '∧',
  or: '∨',
  cap: '∩',
  cup: '∪',
  int: '∫',
  there4: '∴',
  sim: '∼',
  cong: '≅',
  asymp: '≈',
  ne: '≠',
  equiv: '≡',
  le: '≤',
  ge: '≥',
  sub: '⊂',
  sup: '⊃',
  nsub: '⊄',
  sube: '⊆',
  supe: '⊇',
  oplus: '⊕',
  otimes: '⊗',
  perp: '⊥',
  sdot: '⋅',
  lceil: '⌈',
  rceil: '⌉',
  lfloor: '⌊',
  rfloor: '⌋',
  rang: '\u2329',
  lang: '\u232A',
  loz: '◊',
  spades: '♠',
  clubs: '♣',
  hearts: '♥',
  diams: '♦',

  none: '',
};

export function hex2char(hex: string) {
  // converts a single hex number to a character
  // note that no checking is performed to ensure that this is just a hex number, eg. no spaces etc
  // hex: string, the hex codepoint to be converted
  let result = '';
  let n = parseInt(hex, 16);
  if (n <= 0xffff) {
    result += String.fromCharCode(n);
  } else if (n <= 0x10ffff) {
    n -= 0x10000;
    result += String.fromCharCode(0xd800 | (n >> 10)) + String.fromCharCode(0xdc00 | (n & 0x3ff));
  } else {
    result += 'hex2Char error: Code point out of range: ' + dec2hex(n);
  }
  return result;
}

export function dec2char(n: number) {
  // converts a single string representing a decimal number to a character
  // note that no checking is performed to ensure that this is just a hex number, eg. no spaces etc
  // dec: string, the dec codepoint to be converted
  let result = '';
  if (n <= 0xffff) {
    result += String.fromCharCode(n);
  } else if (n <= 0x10ffff) {
    n -= 0x10000;
    result += String.fromCharCode(0xd800 | (n >> 10)) + String.fromCharCode(0xdc00 | (n & 0x3ff));
  } else {
    result += 'dec2char error: Code point out of range: ' + dec2hex(n);
  }
  return result;
}

export function dec2hex(textString: number) {
  return (textString + 0).toString(16).toUpperCase();
}

export function convertAllEscapes(str: string, numbers: string) {
  // converts all escapes in the text str to characters, and can interpret numbers as escapes too
  // str: string, the text to be converted
  // numbers: string enum [none, hex, dec, utf8, utf16], what to treat numbers as

  str = convertUnicode2Char(str);
  str = convertZeroX2Char(str);
  str = convertHexNCR2Char(str);
  str = convertDecNCR2Char(str);
  str = convertjEsc2Char(str, false);
  str = convertCSS2Char(str, false);
  str = convertpEnc2Char(str);
  str = convertEntities2Char(str);
  str = convertNumbers2Char(str, numbers);

  return str.toString();
}

export function convertUnicode2Char(str: string) {
  // converts a string containing U+... escapes to a string of characters
  // str: string, the input

  // first convert the 6 digit escapes to characters
  str = str.replace(/[Uu]\+10([A-Fa-f0-9]{4})/g, function (matchstr, parens) {
    return hex2char('10' + parens);
  });
  // next convert up to 5 digit escapes to characters
  str = str.replace(/[Uu]\+([A-Fa-f0-9]{1,5})/g, function (matchstr, parens) {
    return hex2char(parens);
  });
  return str;
}

export function convertHexNCR2Char(str: string) {
  // converts a string containing &#x...; escapes to a string of characters
  // str: string, the input

  // convert up to 6 digit escapes to characters
  str = str.replace(/&#x([A-Fa-f0-9]{1,6});/g, function (matchstr, parens) {
    return hex2char(parens);
  });
  return str;
}

export function convertDecNCR2Char(str: string) {
  // converts a string containing &#...; escapes to a string of characters
  // str: string, the input

  // convert up to 6 digit escapes to characters
  str = str.replace(/&#(\d{1,7});/g, function (matchstr, parens) {
    return dec2char(parens);
  });
  return str;
}

export function convertZeroX2Char(str: string) {
  // converts a string containing 0x... escapes to a string of characters
  // str: string, the input

  // convert up to 6 digit escapes to characters
  str = str.replace(/0x([A-Fa-f0-9]{1,6})/g, function (matchstr, parens) {
    return hex2char(parens);
  });
  return str;
}

export function convertCSS2Char(str: string, convertbackslash: boolean) {
  // converts a string containing CSS escapes to a string of characters
  // str: string, the input
  // convertbackslash: boolean, true if you want \x etc to become x or \a to be treated as 0xA

  // convert up to 6 digit escapes to characters & throw away any following whitespace
  if (convertbackslash) {
    str = str.replace(/\\([A-Fa-f0-9]{1,6})(\s)?/g, function (matchstr, parens) {
      return hex2char(parens);
    });
    str = str.replace(/\\/g, '');
  } else {
    str = str.replace(/\\([A-Fa-f0-9]{2,6})(\s)?/g, function (matchstr, parens) {
      return hex2char(parens);
    });
  }
  return str;
}

export function convertjEsc2Char(str: string, shortEscapes: boolean) {
  // converts a string containing JavaScript or Java escapes to a string of characters
  // str: string, the input
  // shortEscapes: boolean, if true the function will convert \b etc to characters

  // convert ES6 escapes to characters
  str = str.replace(/\\u\{([A-Fa-f0-9]+)\}/g, function (matchstr, parens) {
    return hex2char(parens);
  });
  // convert \U and 6 digit escapes to characters
  str = str.replace(/\\U([A-Fa-f0-9]{8})/g, function (matchstr, parens) {
    return hex2char(parens);
  });
  // convert \u and 6 digit escapes to characters
  str = str.replace(/\\u([A-Fa-f0-9]{4})/g, function (matchstr, parens) {
    return hex2char(parens);
  });
  // convert \b etc to characters, if flag set
  if (shortEscapes) {
    str = str.replace(/\\b/g, '\b');
    str = str.replace(/\\t/g, '\t');
    str = str.replace(/\\n/g, '\n');
    str = str.replace(/\\v/g, '\v');
    str = str.replace(/\\f/g, '\f');
    str = str.replace(/\\r/g, '\r');
    str = str.replace(/\\'/g, "'");
    str = str.replace(/\\"/g, '"');
    str = str.replace(/\\\\/g, '\\');
  }
  return str;
}

export function convertpEnc2Char(str: string) {
  // converts a string containing precent encoded escapes to a string of characters
  // str: string, the input

  // find runs of hex numbers separated by % and send them for conversion
  str = str.replace(/((%[A-Fa-f0-9]{2})+)/g, function (matchstr, parens) {
    return convertpEsc2Char(parens);
  });
  return str;
}

export function convertEntities2Char(str: string): string {
  // converts a string containing HTML/XML character entities to a string of characters
  // str: string, the input

  str = str.replace(/&([A-Za-z0-9]+);/g, function (matchstr, parens) {
    if (parens in entities) {
      return entities[parens as keyof typeof entities];
    } else {
      return matchstr;
    }
  });
  return str;
}

export function convertNumbers2Char(str: string, type: string) {
  // converts a string containing HTML/XML character entities to a string of characters
  // str: string, the input
  // type: string enum [none, hex, dec, utf8, utf16], what to treat numbers as

  if (type == 'hex') {
    str = str.replace(/(\b[A-Fa-f0-9]{2,6}\b)/g, function (matchstr, parens) {
      return hex2char(parens);
    });
  } else if (type == 'dec') {
    str = str.replace(/(\b\d+\b)/g, function (matchstr, parens) {
      return dec2char(parens);
    });
  } else if (type == 'utf8') {
    str = str.replace(
      /(( [A-Fa-f0-9]{2})+)/g,
      //str = str.replace(/((\b[A-Fa-f0-9]{2}\b)+)/g,
      function (matchstr, parens) {
        return convertUTF82Char(parens);
      },
    );
  } else if (type == 'utf16') {
    str = str.replace(/(( [A-Fa-f0-9]{1,6})+)/g, function (matchstr, parens) {
      return convertUTF162Char(parens);
    });
  }
  return str;
}

export function convertUTF82Char(str: string) {
  // converts to characters a sequence of space-separated hex numbers representing bytes in utf8
  // str: string, the sequence to be converted
  let outputString = '';
  let counter = 0;
  let n = 0;

  // remove leading and trailing spaces
  str = str.replace(/^\s+/, '');
  str = str.replace(/\s+$/, '');
  if (str.length == 0) {
    return '';
  }
  str = str.replace(/\s+/g, ' ');

  for (const item of str.split(' ')) {
    const b = parseInt(item, 16);
    switch (counter) {
      case 0:
        if (0 <= b && b <= 0x7f) {
          // 0xxxxxxx
          outputString += dec2char(b);
        } else if (0xc0 <= b && b <= 0xdf) {
          // 110xxxxx
          counter = 1;
          n = b & 0x1f;
        } else if (0xe0 <= b && b <= 0xef) {
          // 1110xxxx
          counter = 2;
          n = b & 0xf;
        } else if (0xf0 <= b && b <= 0xf7) {
          // 11110xxx
          counter = 3;
          n = b & 0x7;
        } else {
          outputString += 'convertUTF82Char: error1 ' + dec2hex(b) + '! ';
        }
        break;
      case 1:
        if (b < 0x80 || b > 0xbf) {
          outputString += 'convertUTF82Char: error2 ' + dec2hex(b) + '! ';
        }
        counter--;
        outputString += dec2char((n << 6) | (b - 0x80));
        n = 0;
        break;
      case 2:
      case 3:
        if (b < 0x80 || b > 0xbf) {
          outputString += 'convertUTF82Char: error3 ' + dec2hex(b) + '! ';
        }
        n = (n << 6) | (b - 0x80);
        counter--;
        break;
    }
  }
  return outputString.replace(/ $/, '');
}

export function convertUTF162Char(str: string): string {
  // Converts a string of UTF-16 code units to characters
  // str: sequence of UTF16 code units, separated by spaces
  let highsurrogate = 0;
  let outputString = '';

  // remove leading and multiple spaces
  str = str.replace(/^\s+/, '');
  str = str.replace(/\s+$/, '');
  if (str.length == 0) {
    return '';
  }
  str = str.replace(/\s+/g, ' ');

  for (const item of str.split(' ')) {
    const b = parseInt(item, 16);
    if (b < 0 || b > 0xffff) {
      outputString += '!Error in convertUTF162Char: unexpected value, b=' + dec2hex(b) + '!';
    }
    if (highsurrogate != 0) {
      if (0xdc00 <= b && b <= 0xdfff) {
        outputString += dec2char(0x10000 + ((highsurrogate - 0xd800) << 10) + (b - 0xdc00));
        highsurrogate = 0;
        continue;
      } else {
        outputString += 'Error in convertUTF162Char: low surrogate expected, b=' + dec2hex(b) + '!';
        highsurrogate = 0;
      }
    }
    if (0xd800 <= b && b <= 0xdbff) {
      // start of supplementary character
      highsurrogate = b;
    } else {
      outputString += dec2char(b);
    }
  }
  return outputString;
}

export function convertpEsc2Char(str: string) {
  // converts to characters a sequence of %-separated hex numbers representing bytes in utf8
  // str: string, the sequence to be converted

  let outputString = '';
  let counter = 0;
  let n = 0;

  const listArray = str.split('%');
  for (let i = 1; i < listArray.length; i++) {
    const b = parseInt(listArray[i], 16);
    switch (counter) {
      case 0:
        if (0 <= b && b <= 0x7f) {
          // 0xxxxxxx
          outputString += dec2char(b);
        } else if (0xc0 <= b && b <= 0xdf) {
          // 110xxxxx
          counter = 1;
          n = b & 0x1f;
        } else if (0xe0 <= b && b <= 0xef) {
          // 1110xxxx
          counter = 2;
          n = b & 0xf;
        } else if (0xf0 <= b && b <= 0xf7) {
          // 11110xxx
          counter = 3;
          n = b & 0x7;
        } else {
          outputString += 'convertpEsc2Char: error ' + dec2hex(b) + '! ';
        }
        break;
      case 1:
        if (b < 0x80 || b > 0xbf) {
          outputString += 'convertpEsc2Char: error ' + dec2hex(b) + '! ';
        }
        counter--;
        outputString += dec2char((n << 6) | (b - 0x80));
        n = 0;
        break;
      case 2:
      case 3:
        if (b < 0x80 || b > 0xbf) {
          outputString += 'convertpEsc2Char: error ' + dec2hex(b) + '! ';
        }
        n = (n << 6) | (b - 0x80);
        counter--;
        break;
    }
  }
  return outputString;
}
