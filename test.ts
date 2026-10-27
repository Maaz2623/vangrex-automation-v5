import { generateText, Output } from "ai";
import { desktop } from "./src/utils/desktop";
import * as Terminator from "@mediar-ai/terminator";
import { geminiModel } from "./src/model";
import z from "zod";
import robot from "robotjs";

for (let step = 1; step <= 3; step++) {
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
    prompt: `Install thunder client.`,
    instructions: `UI Elements: ${formatted}. Give the name and role of the element. Don't include shortcuts. Always use Pascal casing for role. Also give the proper step intent. If the element is not present in the ui tree, don't guess. If element does not have bounds, or many elements have same role and name, return the appropriate listitem name or other things. We can fetch the bounds with it. Understand ui and take proper steps. Shortest path.`,
    output: Output.object({
      schema: z.object({
        intent: z.string(),
        role: z.string(),
        name: z.string(),

        action: z.discriminatedUnion("type", [
          z.object({
            requiresAction: z.boolean(),
            type: z.literal("click"),
          }),
          z.object({
            requiresAction: z.boolean(),
            type: z.literal("type"),
            text: z.string(),
          }),
        ]),
      }),
    }),
  });

  console.log(result.output);

  if (result.output.action.requiresAction) {
    const selector = `role:${result.output.role} && text:${result.output.name}`;
    const app = await desktop.getCurrentApplication();
    const element = await app.locator(selector).first(1000);
    const { x, y, width, height } = element.bounds();

    const xPercentage = 50;
    const yPercentage = 50;

    const targetX = Math.round(x + (width * xPercentage) / 100);
    const targetY = Math.round(y + (height * yPercentage) / 100);
    switch (result.output.action.type) {
      case "click":
        robot.moveMouseSmooth(targetX, targetY);
        robot.mouseClick();
        console.log("Clicked:", result.output.name);
        break;
      case "type":
        robot.moveMouseSmooth(targetX, targetY);
        robot.mouseClick();
        await app.typeText(result.output.action.text);
    }
  }
  console.log("Input tokens:", result.usage.inputTokens);
}
