import { Bot } from "grammy";
import "dotenv/config";
import { vangrexAgent } from "./agents/vangrex.agent";

const botToken = process.env.TELEGRAM_BOT_TOKEN;

if (!botToken) {
  throw new Error("Invlaid telegram bot token.");
}

const bot = new Bot(botToken);

const activeChats = new Set<number>();

bot.command("start", async (ctx) => {
  await ctx.reply(
    "Vangrex is online. Ask me anything to automate on your desktop.",
  );
});

bot.command("reset", async (ctx) => {
  if (activeChats.has(ctx.chat.id)) {
    await ctx.reply(
      "A task is pending. Please wait before sending another command.",
    );
    return;
  }

  await ctx.reply("Ready for your next command.");
});

bot.on("message:text", async (ctx) => {
  const chatId = ctx.chat.id;
  const prompt = ctx.message.text.trim();

  if (!prompt || prompt.startsWith("/")) return;

  if (activeChats.has(chatId)) {
    await ctx.reply("I'm still processing your previous command. Please wait.");
  }

  activeChats.add(chatId);

  try {
    await ctx.api.sendChatAction(chatId, "typing");

    const result = await vangrexAgent.generate({
      prompt: prompt,
    });

    await ctx.reply(result.text);

    console.log("Total Tokens Used: ", result.usage.totalTokens);
  } catch (error) {
    console.error("Click command error: ", error);

    await ctx.reply(
      `Error: ${error instanceof Error ? error.message : "Unknown"}`,
    );
  } finally {
    activeChats.delete(chatId);
  }
});

bot.catch((error) => {
  console.error("Telegram bot error: ", error);
});

bot.start({
  drop_pending_updates: true,
});

console.log("Vangrex is listening...");
