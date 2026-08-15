import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pdf-tools';

interface MongoClientCache {
    client: MongoClient | null;
    promise: Promise<MongoClient> | null;
}

// Global cache for MongoDB client (survives hot reloads in dev)
declare global {
    // eslint-disable-next-line no-var
    var _mongoClientCache: MongoClientCache | undefined;
}

const globalCache: MongoClientCache = global._mongoClientCache || {
    client: null,
    promise: null,
};

if (!global._mongoClientCache) {
    global._mongoClientCache = globalCache;
}

/**
 * Get MongoDB client with connection pooling
 * Uses cached connection in serverless environment
 */
export async function getMongoClient(): Promise<MongoClient> {
    if (globalCache.client) {
        return globalCache.client;
    }

    if (!globalCache.promise) {
        globalCache.promise = MongoClient.connect(MONGODB_URI, {
            maxPoolSize: 10,
            minPoolSize: 1,
            maxIdleTimeMS: 60000,
        }).then((client: MongoClient) => {
            globalCache.client = client;
            console.log('MongoDB connected successfully');
            return client;
        }).catch((err: Error) => {
            globalCache.client = null;
            globalCache.promise = null;
            throw err;
        });
    }

    return globalCache.promise;
}

/**
 * Get the PDF Tools database instance
 */
export async function getDatabase(): Promise<Db> {
    const client = await getMongoClient();
    // Extract database name from URI or use default
    try {
        const url = new URL(MONGODB_URI);
        const dbName = url.pathname.slice(1).split('?')[0] || 'pdf-tools';
        return client.db(dbName);
    } catch {
        return client.db('pdf-tools');
    }
}

/**
 * Close MongoDB connection (for testing/cleanup)
 */
export async function closeConnection(): Promise<void> {
    if (globalCache.client) {
        await globalCache.client.close();
        globalCache.client = null;
        globalCache.promise = null;
    }
}
