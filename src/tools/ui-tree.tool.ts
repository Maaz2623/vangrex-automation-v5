import { tool } from "ai";
import z from "zod";
import { readFile } from "node:fs/promises";
import { filterTree } from "../utils/tree-filter";

const TREE_FILE = "new-tree.txt";

export const selectElementFromUiTree = tool({
  description:
    "You are responsible to find and select the element from the uitree.",
  inputSchema: z.object({
    name: z
      .string()
      .describe(
        "Name of the element. General name. example: Manage, Extensions, etc.",
      ),
  }),
  execute: async ({ name }) => {
    const tree = await readFile(TREE_FILE, "utf-8");

    const candidates = filterTree(tree, name);

    if (!candidates.trim()) {
      return {
        message: "No matching elements found.",
      };
    }

    return {
      success: true,
      candidates: candidates,
    };
  },
});
