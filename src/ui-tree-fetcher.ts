import * as Terminator from "@mediar-ai/terminator";
import { writeFile } from "node:fs/promises";
import { desktop } from "./utils/desktop";

// --------------------------------------------------
// Configuration
// --------------------------------------------------

const OUTPUT_FILE = "new-tree.txt";
const REFRESH_MS = 1000;

// --------------------------------------------------
// Compact UI Tree
// Output format: Role|Name
// Removes bounds metadata and keyboard shortcuts.
// Missing names are represented by N/A.
// --------------------------------------------------

function compactTree(tree: string): string {
  const output: string[] = [];

  for (const raw of tree.split("\n")) {
    const line = raw.trim();

    if (!line) continue;

    const match = line.match(/^(?:#(\d+)\s+|-\s+)?\[([^\]]+)\]\s*(.*)$/);

    if (!match) continue;

    const [, , role, rawContent] = match;

    let name = rawContent
      // Remove bounds metadata.
      .replace(/\s*\(bounds:\s*\[[^\]]*\][^)]*\)/g, "")
      // Remove keyboard shortcuts, e.g. (Ctrl+Shift+X).
      .replace(/\s*\((?:Ctrl|Alt|Shift|Win|Windows|Cmd|Command)\b[^)]*\)/gi, "")
      .trim();

    if (!name) {
      name = "N/A";
    }

    // Prevent names from breaking the Role|Name format.
    name = name.replace(/\|/g, "/");

    output.push(`${role}|${name}`);
  }

  return output.join("\n");
}

// --------------------------------------------------
// Application Tree
// --------------------------------------------------

export async function getCurrentApplicationTree(): Promise<string> {
  const { formatted } = desktop.getWindowTreeResult("Code", undefined, {
    propertyMode: Terminator.PropertyLoadingMode.Complete,
    formatOutput: true,
    treeOutputFormat: Terminator.TreeOutputFormat.ClusteredYaml,
    includeMonitorScreenshots: false,
    includeWindowScreenshot: false,
  });

  return compactTree(formatted ?? "");
}

// --------------------------------------------------
// Refresh Loop
// --------------------------------------------------

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function main(): Promise<void> {
  console.log(`Watching VS Code UI tree every ${REFRESH_MS} ms.`);
  console.log(`Output: ${OUTPUT_FILE}`);

  while (true) {
    try {
      const tree = await getCurrentApplicationTree();

      if (tree.length > 0) {
        await writeFile(OUTPUT_FILE, tree, "utf8");
      } else {
        console.warn("Empty UI tree received; keeping the previous output.");
      }
    } catch (error) {
      console.error(
        "UI tree refresh failed; retrying on the next cycle:",
        error instanceof Error ? error.message : error,
      );
    }

    await sleep(REFRESH_MS);
  }
}

main().catch(console.error);
