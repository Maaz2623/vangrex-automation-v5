import { tool, ToolLoopAgent } from "ai";
import { geminiModel } from "../model";
import z from "zod";
import { clickAtBounds } from "../utils/mouse";
import { clickAtBoundsTool } from "../tools/mouse.tools";
import { selectElementFromUiTree } from "../tools/ui-tree.tool";

const instructions = `You are responsible to automate the vscode desktop application. use selectElementFromUiTree to find elements in vscode. After every action like click and stuff, if u have to perform more actions, always use selectElementFromUiTree to find elements. To change theme the procedure is: manage, themes, color theme, click any theme from the list.`;

const delay = async (ms: number) =>
  await new Promise((resolve) => setTimeout(resolve, ms));

const vscodeAgent = new ToolLoopAgent({
  model: geminiModel,
  instructions: instructions,
  tools: {
    clickAtBoundsTool,
    selectElementFromUiTree,
  },
  prepareStep: async () => {
    console.log("In 5s Delay to avoid rate limit.");
    await delay(5000);
  },
});

export const vscodeAgentTool = tool({
  description: "Responsible to automate vscode application on desktop",
  inputSchema: z.object({
    task: z.string().describe("The task to accomplish."),
  }),
  execute: async ({ task }) => {
    const result = await vscodeAgent.generate({
      prompt: task,
    });

    return {
      message: result.text,
    };
  },
});
