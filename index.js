import express from "express";
import { Welcome } from "./helpers/welcome.js";
import "dotenv/config";
import { connectDB } from "./database/connection.js";
import authRoutes from "./routes/auth.routes.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/auth", authRoutes);

const port = process.env.PORT;

app.get("/", Welcome);

connectDB().then(() => {
    app.listen(port, () => {
        console.log(`Server is running on the port ${port}`)
    })
}).catch((error) => {
    console.error("Server failed to start:", error.message || "Internal Server Error");
    process.exit(1);
});
