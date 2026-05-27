import { MongoClient } from 'mongodb';

async function run() {
    const client = new MongoClient('mongodb://localhost:27017/pdf-tools');
    await client.connect();
    const db = client.db();
    const job = await db.collection('jobs').find().sort({ createdAt: -1 }).limit(1).toArray();
    console.log(JSON.stringify(job[0], null, 2));
    await client.close();
}

run().catch(console.error);
