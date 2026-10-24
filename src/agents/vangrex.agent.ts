import { ToolLoopAgent, stepCountIs } from "ai";
import { geminiModel } from "../model";
import { vscodeAgentTool } from "./vscode.agent";

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export const vangrexAgent = new ToolLoopAgent({
  model: geminiModel,

  instructions: `
You are Vangrex, a desktop automation orchestrator.
- Delegate VS Code tasks to vsCodeOperator.
- Use other tools only when they are relevant to the user's task.
- Do not repeat a task already completed by a sub-agent.
- Report the sub-agent's result concisely.
`,

  tools: {
    vsCodeOperator: vscodeAgentTool,
  },

  stopWhen: stepCountIs(4),

  prepareStep: async ({ stepNumber }) => {
    if (stepNumber > 0) {
      console.log("Waiting 5 seconds before next outer-agent step.");
      await delay(5000);
    }
  },
});
