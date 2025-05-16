import { MongoClient, Db } from 'mongodb';

// MongoDB Connection URI
const uri = 'mongodb+srv://sravanichennareddy01:FJP2FvubXAwrxNl0@cluster0.6oye3dh.mongodb.net/jsonplaceholder';
const dbName = 'jsonplaceholder';
const client = new MongoClient(uri);

// Connect to MongoDB
export const connectToDb = async (): Promise<Db> => {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    return client.db(dbName);
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
    throw err;
  }
};

// Get database instance
export const getDb = (): Db => client.db(dbName);

// Close database connection
export const closeDb = async (): Promise<void> => {
  await client.close();
  console.log("MongoDB connection closed");
};