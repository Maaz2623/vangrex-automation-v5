import { ToolLoopAgent, toolSearch } from "ai";
import { geminiModel } from "../model";
import { vscodeAgentTool } from "./vscode.agent";

const delay = async (ms: number) =>
  await new Promise((resolve) => setTimeout(resolve, ms));

export const vangrexAgent = new ToolLoopAgent({
  model: geminiModel,
  instructions:
    "You are a desktop automation agent. Use the proper tools applicatin and task wise.",
  tools: {
    search: toolSearch(),
    vsCodeOperator: vscodeAgentTool,
  },
  prepareStep: async () => {
    console.log("In 5s Delay to avoid rate limit.");
    await delay(5000);
  },
});
