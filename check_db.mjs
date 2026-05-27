import { MongoClient } from 'mongodb';

async function run() {
    const client = new MongoClient('mongodb://localhost:27017/pdf-tools');
    await client.connect();
    const db = client.db();
    const job = await db.collection('jobs').findOne({ jobId: '2e_bg6wEpXW9sND9G4S6Xg' });
    console.log(JSON.stringify(job, null, 2));
    await client.close();
}

run().catch(console.error);
