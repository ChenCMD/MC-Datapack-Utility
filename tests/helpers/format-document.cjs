// Minimal TextDocument/Edit support for the pre-refactor formatter baseline.
exports.document = function document(text, eol = '\n', uri = {}) {
  const lines = text.split(/\r\n|\n/);
  const starts = [0];
  for (const match of text.matchAll(/\r\n|\n/g)) starts.push(match.index + match[0].length);
  const doc = {
    uri, eol: eol === '\r\n' ? 2 : 1, lineCount: lines.length,
    getText: () => text,
    lineAt: index => ({ text: lines[index] }),
    offsetAt: ({ line, character }) => line >= lines.length ? text.length : line < 0 ? 0 : starts[line] + Math.min(character, lines[line].length),
    positionAt: offset => {
      const bounded = Math.max(0, Math.min(offset, text.length));
      let line = starts.length - 1;
      while (starts[line] > bounded) line--;
      return { line, character: Math.min(bounded - starts[line], lines[line].length) };
    }
  };
  return doc;
};
exports.applyEdits = function applyEdits(doc, edits) {
  const normalized = edits.map((edit, index) => ({
    start: doc.offsetAt(edit.range.start), end: doc.offsetAt(edit.range.end), text: edit.newText, index
  })).sort((a, b) => a.start - b.start || a.index - b.index);
  let cursor = 0;
  let result = '';
  for (const edit of normalized) {
    if (edit.start < cursor) throw new Error('Overlapping replacement edits');
    result += doc.getText().slice(cursor, edit.start) + edit.text;
    cursor = edit.end;
  }
  return result + doc.getText().slice(cursor);
};
