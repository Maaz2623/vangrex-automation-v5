import { generateText, isStepCount, tool, uploadFile } from "ai";
import z from "zod";
import { readFile } from "node:fs/promises";
import { filterTree } from "../utils/tree-filter";
import * as Terminator from "@mediar-ai/terminator";
import { desktop } from "../utils/desktop";
import { google } from "@ai-sdk/google";
import fs from "node:fs";

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

    console.log(candidates);

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

export const getUiVisionState = tool({
  description: "Use to get the state of the window visually.",
  inputSchema: z.object({
    latestImagePath: z.string().describe("The image to upload to inspect UI"),
    task: z.string().describe("The task the user said"),
  }),
  execute: async ({ latestImagePath, task }) => {
    const { providerReference } = await uploadFile({
      api: google.files(),
      data: fs.readFileSync(latestImagePath as string),
    });

    const result = await generateText({
      model: google("gemini-3.5-flash-lite"),
      stopWhen: isStepCount(10),
      instructions: `You are responsible to understand the screenshot and tell the next agent what to do explicitly with the elements u observe related to the task only. Give in shortest way to understant for the next agent. Like if user asks to change theme, tell it to click on the settings or manage or whatever icon. You don't guess or predict the elements on your own, your knowledge of elements is only what u see in the screenshot.
      example: If the user asks to uninstall an extension, u understand the ui first and if extensions is not open, ur first task to return is click on extensions. then inspect again and second task is to click on thunder client extension inside extensions list if its visible and then inspect again to verify if uninstall button is avaiable. then 3rd task is click uninstall in thunder client.
     
      `,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: task,
            },
            {
              type: "file",
              mediaType: "image/jpg",
              data: providerReference,
            },
          ],
        },
      ],
    });

    return {
      success: true,
      taskStep: result.text,
    };
  },
});
