import { ObjectId as BsonObjectId } from 'bson';

export type ObjectId = BsonObjectId;
export const ObjectId: typeof BsonObjectId;

export type WithId<TSchema> = TSchema & { _id: ObjectId };
export type OptionalUnlessRequiredId<TSchema> = TSchema & { _id?: ObjectId };

export interface IndexOptions {
    unique?: boolean;
    sparse?: boolean;
    expireAfterSeconds?: number;
    name?: string;
    [key: string]: any;
}

export interface InsertOneResult<TSchema = any> {
    acknowledged: boolean;
    insertedId: ObjectId;
}

export interface UpdateResult {
    acknowledged: boolean;
    matchedCount: number;
    modifiedCount: number;
    upsertedCount: number;
    upsertedId: ObjectId | null;
}

export interface DeleteResult {
    acknowledged: boolean;
    deletedCount: number;
}

export interface FindOneAndUpdateOptions {
    returnDocument?: 'before' | 'after';
    upsert?: boolean;
    projection?: Record<string, any>;
    sort?: Record<string, any>;
}

export interface FindCursor<TSchema> {
    sort(sort: Record<string, any>): this;
    limit(limit: number): this;
    skip(skip: number): this;
    project(projection: Record<string, any>): this;
    toArray(): Promise<TSchema[]>;
}

export interface AggregationCursor<TResult = any> {
    toArray(): Promise<TResult[]>;
}

export interface Collection<TSchema = any> {
    createIndex(indexSpec: Record<string, any>, options?: IndexOptions): Promise<string>;
    insertOne(doc: OptionalUnlessRequiredId<TSchema>): Promise<InsertOneResult<TSchema>>;
    findOne(filter: Record<string, any>, options?: any): Promise<WithId<TSchema> | null>;
    findOneAndUpdate(filter: Record<string, any>, update: Record<string, any>, options?: FindOneAndUpdateOptions): Promise<WithId<TSchema> | null>;
    updateOne(filter: Record<string, any>, update: Record<string, any>, options?: any): Promise<UpdateResult>;
    updateMany(filter: Record<string, any>, update: Record<string, any>, options?: any): Promise<UpdateResult>;
    deleteOne(filter: Record<string, any>): Promise<DeleteResult>;
    deleteMany(filter: Record<string, any>): Promise<DeleteResult>;
    find(filter?: Record<string, any>): FindCursor<WithId<TSchema>>;
    aggregate<TResult = any>(pipeline: any[]): AggregationCursor<TResult>;
}

export interface MongoClientOptions {
    maxPoolSize?: number;
    minPoolSize?: number;
    maxIdleTimeMS?: number;
    connectTimeoutMS?: number;
    serverSelectionTimeoutMS?: number;
    [key: string]: any;
}

export interface Db {
    collection<TSchema = any>(name: string): Collection<TSchema>;
    command(command: Record<string, any>): Promise<any>;
}

export class MongoClient {
    constructor(url: string, options?: MongoClientOptions);
    static connect(url: string, options?: MongoClientOptions): Promise<MongoClient>;
    connect(): Promise<this>;
    db(name?: string): Db;
    close(force?: boolean): Promise<void>;
}

declare module 'mongodb' {
    export * from '@/types/mongodb';
}
