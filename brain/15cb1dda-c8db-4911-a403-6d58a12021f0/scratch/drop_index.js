const mongoose = require('c:/Users/DELL/OneDrive/Desktop/BookBridge/server/node_modules/mongoose');

const uri = "mongodb+srv://bookbridge_user:%40heet1605@cluster0.wczv63p.mongodb.net/test?appName=Cluster0";

async function run() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(uri);
    console.log("Connected successfully!");

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log("Collections:", collections.map(c => c.name));

    const reviewsCollection = db.collection('reviews');
    
    console.log("Fetching existing indexes...");
    const indexes = await reviewsCollection.indexes();
    console.log("Existing indexes:", indexes);

    // Drop reviewer_1_transaction_1 index if it exists
    const hasIndex = indexes.some(idx => idx.name === 'reviewer_1_transaction_1');
    if (hasIndex) {
      console.log("Dropping index 'reviewer_1_transaction_1'...");
      await reviewsCollection.dropIndex('reviewer_1_transaction_1');
      console.log("Dropped 'reviewer_1_transaction_1' index!");
    } else {
      console.log("Index 'reviewer_1_transaction_1' not found.");
    }

    // Drop reviewer_1_exchangeRequest_1 index if it exists (so mongoose can recreate it cleanly as partial)
    const hasExchangeIndex = indexes.some(idx => idx.name === 'reviewer_1_exchangeRequest_1');
    if (hasExchangeIndex) {
      console.log("Dropping index 'reviewer_1_exchangeRequest_1'...");
      await reviewsCollection.dropIndex('reviewer_1_exchangeRequest_1');
      console.log("Dropped 'reviewer_1_exchangeRequest_1' index!");
    }

  } catch (err) {
    console.error("Error running script:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
  }
}

run();
