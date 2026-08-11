import "dotenv/config";
import express from "express"; 
import {connectDB} from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import cookieParser from "cookie-parser";
import cors from "cors"
import { app ,server } from "./lib/socket.js";
import { allowedOrigins } from "./lib/allowedOrigins.js";

const PORT = process.env.PORT || 5001;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(cookieParser());
app.use(cors({
    origin: allowedOrigins,
    credentials:true
}));

app.use("/api/auth",authRoutes);
app.use("/api/messages",messageRoutes);
server.listen(PORT,(req,res)=>{
    console.log(`app is running on port: ${PORT}....`);
    connectDB();
});
