const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || 'shivi';

if(!MONGO_URI){
  console.warn('MONGODB_URI not set — DB functions will fail until configured');
}

let client;
let database;

async function connect(){
  if(database) return database;
  if(!client){
    client = new MongoClient(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  }
  await client.connect();
  database = client.db(DB_NAME);
  return database;
}

async function saveMessage(sessionId, role, text){
  const db = await connect();
  const col = db.collection('messages');
  const doc = { sessionId, role, text, createdAt: new Date() };
  const r = await col.insertOne(doc);
  return r.insertedId;
}

async function getHistory(sessionId, limit = 20){
  const db = await connect();
  const col = db.collection('messages');
  const docs = await col.find({ sessionId }).sort({ createdAt: 1 }).limit(limit).toArray();
  return docs;
}

module.exports = { connect, saveMessage, getHistory };
