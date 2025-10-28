import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("✅ Veo3 Telegram Bot is running!");
  }

  try {
    const body = req.body;
    const chatId = body.message?.chat?.id;
    const text = body.message?.text;
    const callback = body.callback_query;
    let reply = "";

    if (callback) {
      const data = callback.data;
      const userId = callback.from.id;

      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: userId,
          text: `✨ You chose *${data}*\nNow type your video prompt (e.g. "a cute rabbit dancing in the forest")`,
          parse_mode: "Markdown"
        })
      });

      global.userAspectRatio = global.userAspectRatio || {};
      global.userAspectRatio[userId] = data;

      return res.status(200).end();
    }

    if (!chatId || !text) return res.status(200).end();

    if (text === "/start") {
      reply = "🎬 Welcome to *Veo3 Video Bot*!\n\nClick below to choose your aspect ratio:";
      
      const keyboard = {
        inline_keyboard: [
          [
            { text: "🎥 16:9", callback_data: "16:9" },
            { text: "📱 9:16", callback_data: "9:16" }
          ]
        ]
      };

      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: reply,
          parse_mode: "Markdown",
          reply_markup: keyboard
        })
      });

      return res.status(200).end();
    }

    if (global.userAspectRatio && global.userAspectRatio[chatId]) {
      const aspectRatio = global.userAspectRatio[chatId];
      const prompt = text;

      reply = `⏳ Generating your *${aspectRatio}* video...\nPrompt: _${prompt}_`;

      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: reply,
          parse_mode: "Markdown"
        })
      });

      const veoRes = await fetch("https://api.veo3.com/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.VEO3_CLIENT_KEY}`
        },
        body: JSON.stringify({
          prompt,
          aspect_ratio: aspectRatio,
          style: "cinematic"
        })
      });

      const data = await veoRes.json();

      if (data.video_url) {
        reply = `✅ Done! Here's your *${aspectRatio}* video:\n${data.video_url}`;
      } else {
        reply = "❌ Failed to generate video. Please try again later.";
      }

      delete global.userAspectRatio[chatId];
    } 
    else {
      reply = "👋 Type /start to choose your video aspect ratio first.";
    }

    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: reply,
        parse_mode: "Markdown"
      })
    });

    res.status(200).end();
  } catch (err) {
    console.error("Error:", err);
    res.status(500).send("Internal Server Error");
  }
}
