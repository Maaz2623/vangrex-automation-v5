import { tool } from "ai";
import z from "zod";
import { typeText } from "../utils/keyboard";

export const typeTextTool = tool({
  description: "Use to select element and type text into it.",
  inputSchema: z.object({
    name: z.string().describe("Name of the selected element."),
    role: z.string().describe("Role of the selected element."),
    text: z.string().describe("The text to type in."),
  }),
  execute: async ({ name, role, text }) => {
    try {
      await typeText({
        name,
        role,
        text,
      });
      return {
        success: true,
        message: "Typing complete.",
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
