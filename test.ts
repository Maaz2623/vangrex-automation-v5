import { generateText, isStepCount, Output, uploadFile } from "ai";
import { desktop } from "./src/utils/desktop";
import * as Terminator from "@mediar-ai/terminator";
import { geminiModel } from "./src/model";
import { readFile } from "node:fs/promises";
import robotjs from "robotjs";
import { selectElementFromUiTree } from "./src/tools/ui-tree.tool";
import { hoverAtBoundsTool } from "./src/tools/mouse.tools";
import { google } from "@ai-sdk/google";
import fs from "node:fs";
import z from "zod";

const tree = await desktop.getWindowTreeResult("Code", undefined, {
  formatOutput: true,
  treeOutputFormat: Terminator.TreeOutputFormat.CompactYaml,
  propertyMode: Terminator.PropertyLoadingMode.Complete,
  includeWindowScreenshot: true,
});

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const { providerReference } = await uploadFile({
  api: google.files(),
  data: fs.readFileSync(tree.windowScreenshotPath as string),
});

const result = await generateText({
  model: google("gemini-3.5-flash-lite"),
  stopWhen: isStepCount(20),
  instructions: `You are responsible to understand the screenshot and tell the next agent what to do explicitly with the elements u observe related to the task only. Give in shortest way to understant for the next agent. Like if user asks to change theme, tell it to click on the settings or manage or whatever icon. You don't guess or predict the elements on your own, your knowledge of elements is only what u see in the screenshot
 
  `,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "If there is any pop up. Close it",
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

console.log("First Agent: ", result.text, result.usage.inputTokens);

const findElementResult = await generateText({
  model: geminiModel,
  instructions: `You are responsible to find the elements from the ui tree. Always Use the selectElementFromUiTree to search for the element. And select a candidate from the candidates returned and give that as output name and role. Don't include the shortcuts and parenthesis from the candidates`,
  stopWhen: isStepCount(30),
  tools: {
    selectElementFromUiTree,
  },
  prompt: result.text,
  output: Output.object({
    schema: z.object({
      role: z.string(),
      name: z.string(),
    }),
  }),
});

console.log(
  "Second Agent: ",
  findElementResult.output,
  findElementResult.toolCalls,
  result.usage.inputTokens,
);

const element = await desktop
  .locator(
    `role:${findElementResult.output.role}|name:${findElementResult.output.name}`,
  )
  .first(2000);

const bounds = element.bounds();

console.log("Bounds: ", bounds);

const xPercentage = 50;
const yPercentage = 50;

const targetX = Math.round(bounds.x + (bounds.width * xPercentage) / 100);
const targetY = Math.round(bounds.y + (bounds.height * yPercentage) / 100);

robotjs.moveMouseSmooth(targetX, targetY);
