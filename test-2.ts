import { generateText, Output, uploadFile } from "ai";
import { desktop } from "./src/utils/desktop";
import * as Terminator from "@mediar-ai/terminator";
import { google } from "@ai-sdk/google";
import fs from "node:fs";
import { writeFile } from "node:fs/promises";
import { geminiModel } from "./src/model";
import z from "zod";
import { filterTree } from "./src/utils/tree-filter";
import robot from "robotjs";

// --------------------------------------------------
// Configuration
// --------------------------------------------------

const OUTPUT_FILE = "new-tree.txt";
const MAX_STEPS = 5;
const STEP_DELAY_MS = 2000;
const LOCATOR_TIMEOUT_MS = 100;

// --------------------------------------------------
// Helpers and logging
// --------------------------------------------------

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const startedAt = Date.now();
let logCounter = 0;

function log(message: string, data?: unknown): void {
  const timestamp = new Date().toISOString();
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(2);
  const prefix = `[${timestamp}] [+${elapsed}s] [${++logCounter}]`;

  if (data !== undefined) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

function logError(message: string, error: unknown): void {
  log(message, {
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error,
  });
}

async function timed<T>(
  label: string,
  operation: () => Promise<T>,
): Promise<T> {
  const started = Date.now();
  log(`${label}: START`);

  try {
    const result = await operation();
    log(`${label}: SUCCESS (${Date.now() - started} ms)`);
    return result;
  } catch (error) {
    logError(`${label}: FAILED (${Date.now() - started} ms)`, error);
    throw error;
  }
}

const selectionSchema = z.object({
  error: z.object({
    isError: z.boolean(),
    message: z.string(),
  }),
  role: z.string(),
  name: z.string(),
});

type SelectionResult = {
  output: z.infer<typeof selectionSchema>;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
};

/**
 * Ask Gemini to choose an element from the supplied tree.
 * The full tree is used only if the filtered tree does not contain a target.
 */
async function selectElement(
  availableTree: string,
  requestedAction: string,
  treeDescription: string,
): Promise<SelectionResult> {
  return await timed(
    `Gemini element selection (${treeDescription})`,
    async () => {
      const result = await generateText({
        model: geminiModel,
        prompt: `
Available UI elements:
${availableTree}

Requested action:
${requestedAction}

Select the single most appropriate element for this action.

Rules:
- Return the exact role and full element name from the supplied UI elements.
- The role must use PascalCase.
- Do not invent elements.
- Do not include keyboard shortcuts in the returned name.
- If the requested action is to install an extension, choose the actual
  Install button belonging to the requested extension, not its title,
  ListItem, a similarly named alternative, or an unrelated button.
- If a button's accessible name is generic, use its surrounding extension
  context to identify it. Do not guess if the target cannot be identified.
- If the target is absent or ambiguous, set error.isError=true and explain why.
        `,
        instructions:
          "Select an element from the supplied UI tree. Never guess. Return its exact role and name.",
        output: Output.object({ schema: selectionSchema }),
      });

      return {
        output: result.output,
        usage: result.usage,
      };
    },
  );
}

// --------------------------------------------------
// Main workflow: one UI action per iteration
// --------------------------------------------------

async function main(prompt: string): Promise<boolean> {
  log("==================================================");
  log("MAIN WORKFLOW STARTED");
  log("User task:", prompt);

  await delay(STEP_DELAY_MS);

  // 1. Capture UI tree and screenshot.
  log("Requesting VS Code UI tree and screenshot");

  const tree = await timed("Get UI tree", async () => {
    return await desktop.getWindowTreeResult("Code", undefined, {
      formatOutput: true,
      treeOutputFormat: Terminator.TreeOutputFormat.CompactYaml,
      propertyMode: Terminator.PropertyLoadingMode.Complete,
      includeWindowScreenshot: true,
    });
  });

  log("UI tree received", {
    hasFormattedTree: Boolean(tree.formatted),
    treeLength: tree.formatted?.length ?? 0,
    screenshotPath: tree.windowScreenshotPath,
  });

  if (!tree.formatted) {
    throw new Error("The UI tree is empty.");
  }

  if (!tree.windowScreenshotPath) {
    throw new Error("No screenshot path was returned.");
  }

  await timed("Write UI tree to file", async () => {
    await writeFile(OUTPUT_FILE, tree.formatted!, "utf8");
  });

  log("UI tree saved", {
    file: OUTPUT_FILE,
    characters: tree.formatted.length,
  });

  // 2. Validate screenshot.
  const screenshotPath = tree.windowScreenshotPath;

  if (!fs.existsSync(screenshotPath)) {
    throw new Error(`Screenshot file does not exist: ${screenshotPath}`);
  }

  const screenshotStats = fs.statSync(screenshotPath);
  log("Screenshot details", {
    path: screenshotPath,
    sizeBytes: screenshotStats.size,
    sizeKB: (screenshotStats.size / 1024).toFixed(2),
  });

  if (screenshotStats.size === 0) {
    throw new Error("Screenshot file is empty.");
  }

  const screenshotData = fs.readFileSync(screenshotPath);

  // 3. Upload screenshot.
  const { providerReference } = await timed(
    "Upload screenshot to Google",
    async () =>
      await uploadFile({
        api: google.files(),
        data: screenshotData,
      }),
  );

  log("Screenshot uploaded successfully", {
    hasProviderReference: Boolean(providerReference),
  });

  // 4. Visual understanding.
  const visualResult = await timed(
    "Gemini visual understanding",
    async () =>
      await generateText({
        model: geminiModel,
        instructions: `
Inspect the screenshot and understand the current UI state.

Based on the user's task, decide the next single UI action.
Return takeAction=false only when the task is already complete or when no
safe, useful action can be determined from the screenshot.

For extension installation:
- Check whether the requested extension is already installed.
- Distinguish the actual extension from similarly named alternatives.
- If its Install button is visible, request clicking that button.
- If a reload-required notification is visible, consider whether the UI
  indicates a pending uninstall/reload before deciding the next action.
- Never claim installation succeeded merely because a click was performed.

Return only one next step at a time.
        `,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "file",
                mediaType: "image/jpeg",
                data: providerReference,
              },
            ],
          },
        ],
        output: Output.object({
          schema: z.object({
            step: z.string(),
            takeAction: z.boolean(),
          }),
        }),
      }),
  );

  log("Visual understanding response received", {
    text: visualResult.text,
    output: visualResult.output,
    usage: visualResult.usage,
  });

  const nextStep = visualResult.output.step;
  const shouldTakeAction = visualResult.output.takeAction;

  log("Next action decision", {
    step: nextStep,
    takeAction: shouldTakeAction,
  });

  if (!shouldTakeAction) {
    log("Visual agent reports no action is required.");
    return true;
  }

  // 5. Filter UI tree.
  log("Starting UI tree filtering", {
    requestedAction: nextStep,
    inputTreeLength: tree.formatted.length,
  });

  const candidates = filterTree(tree.formatted, nextStep);

  log("UI tree filtering completed", {
    candidateLength: candidates.length,
    candidates,
  });

  // 6. Select from filtered candidates, then retry against the original tree.
  let selection: SelectionResult | undefined;

  if (candidates.trim()) {
    selection = await selectElement(
      candidates,
      nextStep,
      "filtered candidates",
    );

    log("Filtered element selection response", {
      output: selection.output,
      usage: selection.usage,
    });
  } else {
    log(
      "The filter returned no candidates; going directly to full-tree fallback.",
    );
  }

  if (!selection || selection.output.error.isError) {
    log("Filtered selection failed; retrying against the original UI tree", {
      reason: selection?.output.error.message ?? "No filtered candidates",
      originalTreeLength: tree.formatted.length,
    });

    selection = await selectElement(
      tree.formatted,
      nextStep,
      "complete UI tree fallback",
    );

    log("Full-tree fallback selection response", {
      output: selection.output,
      usage: selection.usage,
    });
  }

  if (selection.output.error.isError) {
    log("Element selection failed after full-tree fallback", {
      message: selection.output.error.message,
    });
    return false;
  }

  const selectedRole = selection.output.role;
  const selectedName = selection.output.name;

  if (!selectedRole.trim() || !selectedName.trim()) {
    throw new Error("AI returned an empty role or element name.");
  }

  log("Selected element", {
    role: selectedRole,
    name: selectedName,
  });

  // Safety check for this task: don't click an arbitrary extension element.
  const isThunderClientInstallAction =
    /install/i.test(nextStep) && /thunder\s*client/i.test(prompt);

  if (isThunderClientInstallAction) {
    const isButton = selectedRole.toLowerCase() === "button";
    const nameLooksLikeInstall = /\binstall\b/i.test(selectedName);
    const nameLooksLikeThunderClient = /thunder\s*client/i.test(selectedName);

    if (!isButton || !nameLooksLikeInstall || !nameLooksLikeThunderClient) {
      log("Selected element failed the extension-install safety check", {
        role: selectedRole,
        name: selectedName,
        reason:
          "Expected a Button whose accessible name identifies both Install and Thunder Client.",
      });
      return false;
    }
  }

  // 7. Locate the selected element.
  const selector = `role:${selectedRole}|name:${selectedName}`;
  log("Constructed locator selector", selector);

  const element = await timed("Locate UI element", async () => {
    return await desktop.locator(selector).first(LOCATOR_TIMEOUT_MS);
  });

  log("UI element located successfully");

  // 8. Read and validate bounds.
  const bounds = await timed("Read element bounds", async () => {
    return await element.bounds();
  });

  log("Element bounds received", bounds);

  const { x, y, width, height } = bounds;

  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error(`Invalid element bounds: ${JSON.stringify(bounds)}`);
  }

  const targetX = Math.round(x + width / 2);
  const targetY = Math.round(y + height / 2);

  log("Target coordinates calculated", { targetX, targetY });

  // 9. Move and click.
  await timed("Move mouse", async () => {
    robot.moveMouseSmooth(targetX, targetY, -1);
  });

  log("Mouse movement completed", { targetX, targetY });

  await timed("Mouse click", async () => {
    robot.mouseClick();
  });

  log("Mouse click completed", {
    role: selectedRole,
    name: selectedName,
    targetX,
    targetY,
  });

  log("MAIN WORKFLOW ACTION COMPLETED");
  return false;
}

// --------------------------------------------------
// Run up to MAX_STEPS actions; stop when task is done
// --------------------------------------------------

async function run(): Promise<void> {
  const task = "Install Thunder Client.";

  log("VANGREX STARTED");
  log(`Maximum workflow iterations: ${MAX_STEPS}`);

  for (let step = 0; step < MAX_STEPS; step++) {
    log("--------------------------------------------------");
    log(`Starting iteration ${step + 1}/${MAX_STEPS}`);

    const iterationStarted = Date.now();

    try {
      const taskComplete = await main(task);

      log(`Iteration ${step + 1} finished`, {
        durationMs: Date.now() - iterationStarted,
        taskComplete,
      });

      if (taskComplete) {
        log("Workflow stopped because the visual agent reported completion.");
        return;
      }
    } catch (error) {
      logError(`Iteration ${step + 1} failed`, error);
    }

    if (step < MAX_STEPS - 1) {
      log(`Waiting ${STEP_DELAY_MS} ms before next iteration`);
      await delay(STEP_DELAY_MS);
    }
  }

  log("Maximum workflow iterations reached.");
}

run().catch((error) => {
  logError("Fatal Vangrex error", error);
  process.exitCode = 1;
});
