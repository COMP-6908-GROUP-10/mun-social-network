"use server"

import { connect } from 'mongoose';

const connection = process.env.MONGO_DB_CONNECTION

let isConnected = false; // global connection state

export async function connectDB() {

    if (isConnected) {
        console.log("Database: Already Connected!!!");
        return
    }

    console.log("Database: Connecting...");

    try {
        const db = await connect(connection || "");
        isConnected = !!db.connections[0].readyState;
        console.log("✅ Database connected successfully");

    } catch (err) {
        console.error("❌ Database connection failed:", err);
    }
}




await connectDB().catch(console.error);

