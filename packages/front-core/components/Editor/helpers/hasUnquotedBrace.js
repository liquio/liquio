export const hasUnquotedBrace = (line, brace = '}') => {
  if (!['{', '}'].includes(brace)) {
    throw new Error("Brace must be '{' or '}'");
  }

  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;
  let escaped = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    // Handle quote entering/exiting
    if (!inSingleQuote && !inDoubleQuote && !inBacktick) {
      if (char === "'") {
        inSingleQuote = true;
      } else if (char === '"') {
        inDoubleQuote = true;
      } else if (char === '`') {
        inBacktick = true;
      }
    } else {
      if (char === "'" && inSingleQuote) inSingleQuote = false;
      else if (char === '"' && inDoubleQuote) inDoubleQuote = false;
      else if (char === '`' && inBacktick) inBacktick = false;
      continue;
    }

    // Only check for the specified brace when outside quotes
    if (char === brace && !inSingleQuote && !inDoubleQuote && !inBacktick) {
      return true;
    }
  }

  return false;
}
