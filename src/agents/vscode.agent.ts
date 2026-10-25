import {
  tool,
  ToolLoopAgent,
  toolSearch,
  stepCountIs,
  pruneMessages,
  type ModelMessage,
} from "ai";
import { geminiModel } from "../model";
import z from "zod";
import { clickAtBoundsTool, hoverAtBoundsTool } from "../tools/mouse.tools";
import {
  getUiVisionState,
  selectElementFromUiTree,
} from "../tools/ui-tree.tool";
import { typeTextTool } from "../tools/keyboard.tools";

const instructions = `
You are Vangrex's VS Code desktop operator.
Always run the getUiVisionState after every other tool step and initially to inspect the WIndow UI visually.

Procedures:
- To create a file or folder, hover over explorer section followed by dir name and a new elements about new file and stuff will appear in tree click it precisely. Then click the either options.

Rules:
- Complete the user's task using the fewest tool calls.
- Use the image returned by the select element from ui tree tool to make decisions.
- Use the UI tree to identify the exact target before interacting.
- After an action, refresh the UI tree only if another action requires updated state.
- Never repeat a successful action or search without a reason.
- Use exact element names; avoid guessing selectors.
- If an action fails, inspect the latest UI and try one corrected approach.
- For theme changes: Manage > Themes > Color Theme > select the requested theme.
- Stop when the task is complete. Briefly report the result.
`;

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const vscodeAgent = new ToolLoopAgent({
  model: geminiModel,
  instructions,
  tools: {
    search: toolSearch(),
    getUiVisionState,
    clickAtBoundsTool,
    selectElementFromUiTree,
    typeTextTool,
    hoverAtBoundsTool,
  },

  // Prevent an unbounded sequence of actions.
  stopWhen: stepCountIs(50),

  prepareStep: async ({ messages }) => {
    await delay(1000);
  },
});

export const vscodeAgentTool = tool({
  description: "Automates tasks in the VS Code desktop application.",
  inputSchema: z.object({
    task: z.string().describe("The task to accomplish in VS Code."),
  }),

  execute: async ({ task }) => {
    const result = await vscodeAgent.generate({ prompt: task });

    console.table(
      result.steps.map((step, i) => ({
        step: i + 1,
        input: step.usage.inputTokens,
        output: step.usage.outputTokens,
        total: step.usage.totalTokens,
        calls: step.toolCalls.length,
      })),
    );

    console.log("Total usage:", result.usage);

    return { message: result.text };
  },
});
