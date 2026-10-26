export function filterTree(tree: string, prompt: string): string {
  const lines = tree.split("\n");

  const elements = lines
    .map((line) => {
      const match = line.match(/\[(.*?)\]\s*(.*)/);

      if (!match) return null;

      const role = match[1].trim();

      // Extract the name for matching without modifying the original line.
      const name = match[2]
        .replace(/\s*\(bounds:.*$/, "")
        .replace(
          /\s*\((?:Ctrl|Alt|Shift|Win|Windows|Cmd|Command)\b[^)]*\)/gi,
          "",
        )
        .trim();

      if (!role || !name) return null;

      return {
        role,
        name,
        line, // Preserve the complete original tree line.
      };
    })
    .filter(
      (element): element is { role: string; name: string; line: string } =>
        element !== null,
    );

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
    .map((element, index) => {
      const description = `${element.role} ${element.name}`.toLocaleLowerCase();

      const score = words.reduce(
        (total, word) => total + (description.includes(word) ? 1 : 0),
        0,
      );

      return {
        line: element.line,
        score,
        index,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const result = ranked
    .slice(0, 10)
    .map((item) => item.line)
    .join("\n");

  console.log(
    "Filtered candidates:\n",
    result || "No matching elements found.",
  );

  return result;
}
