export function filterTree(tree: string, prompt: string): string {
  const lines = tree.split("\n");

  const elements = lines.filter((line) => {
    const seperator = line.indexOf("|");

    if (seperator === -1) return false;

    const role = line.slice(0, seperator).trim();

    const name = line.slice(seperator + 1).trim();

    return role.length > 0 && name.length > 0;
  });

  const stopWords = new Set([
    "click",
    "on",
    "the",
    "a",
    "an",
    "please",
    "button",
    "icon",
    "element",
    "open",
    "select",
    "to",
    "in",
    "and",
    "for",
    "with",
    "from",
    "app",
    "application",
    "using",
    "then",
  ]);

  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9+#\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !stopWords.has(word));

  const ranked = elements
    .map((line, index) => {
      const seperator = line.indexOf("|");
      const role = line.slice(0, seperator).trim();
      const name = line.slice(seperator + 1).trim();

      const description = `${role} ${name}`.toLocaleLowerCase();

      const score = words.reduce(
        (total, word) => total + (description.includes(word) ? 1 : 0),
        0,
      );

      return {
        line: `${role} ${name}`,
        score,
        index,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);

  console.log(
    ranked
      .slice(0, 10)
      .map((item) => item.line)
      .join("\n"),
  );

  return ranked
    .slice(0, 10)
    .map((item) => item.line)
    .join("\n");
}
