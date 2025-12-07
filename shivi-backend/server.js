const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const COHERE_KEY = process.env.COHERE_API_KEY;
const COHERE_MODEL = process.env.COHERE_MODEL || "command-r-08-2024";
const MONGO_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "shivi";

let db;

async function connectDB(){
  if(db) return db;
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log("✅ Mongo connected");
  return db;
}

app.post("/api/chat", async (req, res) => {
  try{
    const { sessionId, message, name } = req.body;
    if(!sessionId || !message){
      return res.status(400).json({ error: "Missing sessionId or message" });
    }

    const database = await connectDB();
    const col = database.collection("messages");

    await col.insertOne({
      sessionId,
      role: "user",
      text: message,
      createdAt: new Date()
    });

    const history = await col.find({ sessionId })
      .sort({ createdAt: 1 })
      .limit(20)
      .toArray();

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

    await col.insertOne({
      sessionId,
      role: "assistant",
      text: reply,
      createdAt: new Date()
    });

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
