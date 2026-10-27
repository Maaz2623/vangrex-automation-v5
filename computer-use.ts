import robot from "robotjs";
import { GoogleGenAI } from "@google/genai";
import { readFile, writeFile } from "node:fs/promises";
import { desktop } from "./src/utils/desktop";
import * as Terminator from "@mediar-ai/terminator";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

const selector = "role:TabItem|name:Extensions";

// 1. Find the element while VS Code is available.
const element = await desktop.locator(selector).first(2000);

console.log("Element bounds:", element.bounds());

// 2. Capture the screenshot BEFORE highlighting.
// Use a desktop screenshot API here if you need the full desktop.
const screenshotBefore = await desktop.getWindowTreeResult("Code", undefined, {
  formatOutput: true,
  propertyMode: Terminator.PropertyLoadingMode.Complete,
  treeOutputFormat: Terminator.TreeOutputFormat.ClusteredYaml,
  includeWindowScreenshot: true,
});

console.log(
  "Screenshot before highlight:",
  screenshotBefore.windowScreenshotPath,
);

// 3. Highlight the element.
const highlightHandle = element.highlight(0x0000ff, 10000, "Extensions");

// 4. Wait for the overlay to render.
await new Promise((resolve) => setTimeout(resolve, 1000));

// IMPORTANT:
// Do not call getWindowTreeResult("Code", ...) here.
// The highlight overlay may interfere with finding the VS Code window.

// 5. Read the screenshot captured earlier.
const screenshot = await readFile(
  screenshotBefore.windowScreenshotPath as string,
);

await writeFile("screenshot.png", screenshot);

// 6. Send it to Gemini.
const response = await ai.interactions.create({
  model: "gemini-3.5-flash-lite",
  input: [
    {
      type: "text",
      text: `
Analyze this screenshot of Visual Studio Code.
Identify the center of the highlighted area.
Return normalized coordinates between 0 and 1000.
Return JSON only: {"x": 0, "y": 0}
`,
    },
    {
      type: "image",
      data: screenshot.toString("base64"),
      mime_type: "image/png",
    },
  ],
});

console.dir(response, { depth: null });

highlightHandle.close();

robot.moveMouseSmooth(21, 217);
