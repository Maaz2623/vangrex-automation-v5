import { ToolLoopAgent, toolSearch } from "ai";
import { geminiModel } from "../model";
import { vscodeAgentTool } from "./vscode.agent";

export const vangrexAgent = new ToolLoopAgent({
  model: geminiModel,
  instructions:
    "You are a desktop automation agent. Use the proper tools applicatin and task wise.",
  tools: {
    search: toolSearch(),
    vsCodeOperator: vscodeAgentTool,
  },
});
