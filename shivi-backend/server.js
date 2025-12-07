const express = require("express");
const cors = require("cors");
const axios = require("axios");
const db = require('./db');
require("dotenv").config();

const app = express();
// Configure CORS: if ALLOWED_ORIGIN is set in env, restrict to that origin.
const ALLOWED = process.env.ALLOWED_ORIGIN;
if(ALLOWED){
  app.use(cors({ origin: ALLOWED }));
  console.log('CORS restricted to:', ALLOWED);
}else{
  app.use(cors());
  console.log('CORS: allowing all origins (not recommended for production)');
}
app.use(express.json());

const COHERE_KEY = process.env.COHERE_API_KEY;
const COHERE_MODEL = process.env.COHERE_MODEL || "command-r-08-2024";
// DB helper is in `db.js` — it will warn if `MONGODB_URI` is not set.

app.post("/api/chat", async (req, res) => {
  try{
    const { sessionId, message, name } = req.body;
    if(!sessionId || !message){
      return res.status(400).json({ error: "Missing sessionId or message" });
    }

    // save user message
    await db.saveMessage(sessionId, 'user', message);
    // fetch recent history
    const history = await db.getHistory(sessionId, 20);

    const messages = [
      {
        role: "system",
        content: `
You are Shivi, a emotional Hinglish best friend.
Speak like a close friend.
Never say you are AI.
Be warm, caring, and supportive.
Use emojis 💚😄🫂`,
      },
      ...history.map(m => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text
      }))
    ];

    const r = await axios.post(
      "https://api.cohere.com/v2/chat",
      {
        model: COHERE_MODEL,
        messages,
        max_tokens: 200,
        temperature: 0.6
      },
      {
        headers:{
          Authorization: `Bearer ${COHERE_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const reply = r.data.message?.content?.[0]?.text || "Shivi busy hai thoda 😅";

    await db.saveMessage(sessionId, 'assistant', reply);

    res.json({ reply });
  }catch(err){
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/", (req,res)=>{
  res.send("Shivi backend running ✅");
});

module.exports = app;
