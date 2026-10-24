import { tool } from "ai";
import z from "zod";
import { clickAtBounds } from "../utils/mouse";

export const clickAtBoundsTool = tool({
  description: "Use to click on elements",
  inputSchema: z.object({
    name: z.string().describe("The name of the element."),
    role: z.string().describe("The role of the element."),
    clickType: z
      .enum(["left", "right"])
      .describe("Type of click. 'right' or 'left'."),
    double: z.boolean().describe("True if element requires double click."),
  }),
  execute: async ({ name, role, clickType, double }) => {
    try {
      await clickAtBounds({
        name,
        role,
        clickType,
        double,
      });

      return {
        success: true,
        message: "Clicked",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Something went wrong.",
      };
    }
  },
});
