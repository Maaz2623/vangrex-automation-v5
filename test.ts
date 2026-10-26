import { generateText, Output } from "ai";
import { desktop } from "./src/utils/desktop";
import * as Terminator from "@mediar-ai/terminator";
import { geminiModel } from "./src/model";
import z from "zod";
import robot from "robotjs";

for (let step = 1; step <= 4; step++) {
  console.log(`\n--- Step ${step}/3 ---`);

  const { formatted } = desktop.getWindowTreeResult("Code", undefined, {
    propertyMode: Terminator.PropertyLoadingMode.Complete,
    formatOutput: true,
    treeOutputFormat: Terminator.TreeOutputFormat.ClusteredYaml,
    includeMonitorScreenshots: false,
    includeWindowScreenshot: false,
  });

  const result = await generateText({
    model: geminiModel,
    prompt: "UnInstall thunder client extension",
    instructions: `UI Elements: ${formatted}. Give the name and role of the element. Don't include shortcuts. Always use Pascal casing for role.`,
    output: Output.object({
      schema: z.object({
        role: z.string(),
        name: z.string(),
      }),
    }),
  });

  console.log("Target:", result.output);

  const selector = `role:${result.output.role}|name:${result.output.name}`;

  const element = await desktop.locator(selector).first(1000);

  const { x, y, width, height } = element.bounds();

  const xPercentage = 50;
  const yPercentage = 50;

  const targetX = Math.round(x + (width * xPercentage) / 100);
  const targetY = Math.round(y + (height * yPercentage) / 100);

  robot.moveMouseSmooth(targetX, targetY);
  robot.mouseClick();

  console.log("Clicked:", result.output.name);
  console.log("Input tokens:", result.usage.inputTokens);
}
