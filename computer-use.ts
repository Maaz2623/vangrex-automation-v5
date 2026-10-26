// import { GoogleGenAI } from "@google/genai";
// import { readFile } from "node:fs/promises";

// const ai = new GoogleGenAI({
//   apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
// });

// const screenshot = await readFile("screenshot.png");

// const response = await ai.interactions.create({
//   model: "gemini-3.5-flash-lite",
//   input: [
//     {
//       type: "text",
//       text: `
// Analyze this screenshot of Visual Studio Code.

// Identify the icons in the activity bar on the left.
// For each icon, provide:
// - Name
// - Approximate center coordinates (x, y)
// - Confidence

// Return the results as JSON.
//       `,
//     },
//     {
//       type: "image",
//       data: screenshot.toString("base64"),
//       mime_type: "image/png",
//     },
//   ],
// });

// console.dir(response, { depth: null });

import robot from "robotjs";

const screen = robot.getScreenSize();

function denormalizeX(x: number, screenWidth: number) {
  // Convert normalized x coordinate (0-1000) to actual pixel coordinate.
  return Math.floor((x / 1000) * screenWidth);
}

function denormalizeY(y: number, screenHeight: number) {
  // Convert normalized y coordinate (0-1000) to actual pixel coordinate.
  return Math.floor((y / 1000) * screenHeight);
}

const actualX = denormalizeX(267, screen.width);
const actualY = denormalizeY(18, screen.height);

robot.moveMouseSmooth(actualY, actualX);
