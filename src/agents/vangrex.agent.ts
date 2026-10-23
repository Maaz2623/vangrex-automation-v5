import { ToolLoopAgent } from "ai";
import { geminiModel } from "../model";

export const vangrexAgent = new ToolLoopAgent({
  model: geminiModel,
  instructions: "You are a desktop automation agent.",
});
