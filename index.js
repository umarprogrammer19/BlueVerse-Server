import express from "express";
import "dotenv/config";
import cors from "cors";
import { Welcome } from "./helpers/welcome.js";
import { connectDB } from "./database/connection.js";
import authRoutes from "./routes/auth.routes.js";
import cookieParser from "cookie-parser";
import invoiceRoutes from "./routes/invoice.routes.js";
import customerRoutes from "./routes/customer.routes.js";

const app = express();
app.use(express.json());
app.use(cors({
    origin: ["http://localhost:5173", "https://blueverse-checkout.netlify.app"],
}))
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/customers", customerRoutes);

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
