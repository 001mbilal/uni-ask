/**
 * Split page text into overlapping chunks, preferring line boundaries so that
 * headings stay with the text under them and table rows stay together.
 */
export function chunkText(
  text: string,
  maxChars = 1000,
  overlapChars = 150
): string[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current: string[] = [];
  let size = 0;

  const flush = () => {
    if (!current.length) return;
    chunks.push(current.join("\n"));
    // carry the tail of this chunk into the next one
    const tail: string[] = [];
    let tailSize = 0;
    for (let i = current.length - 1; i >= 0; i--) {
      if (tailSize + current[i].length > overlapChars) break;
      tail.unshift(current[i]);
      tailSize += current[i].length;
    }
    current = tail;
    size = tailSize;
  };

  for (const line of lines) {
    // hard-split very long lines
    const pieces: string[] = [];
    if (line.length > maxChars) {
      for (let i = 0; i < line.length; i += maxChars - overlapChars) {
        pieces.push(line.slice(i, i + maxChars));
      }
    } else {
      pieces.push(line);
    }
    for (const p of pieces) {
      if (size + p.length > maxChars && current.length) flush();
      current.push(p);
      size += p.length + 1;
    }
  }
  if (current.length) {
    const last = current.join("\n");
    // avoid emitting a final chunk that is only overlap from the previous one
    if (!chunks.length || !chunks[chunks.length - 1].endsWith(last)) {
      chunks.push(last);
    }
  }
  return chunks;
}
