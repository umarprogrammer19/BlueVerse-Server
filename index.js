import express from "express";
import { Welcome } from "./helpers/welcome.js";
import "dotenv/config";

const app = express();
const port = process.env.PORT;

app.get("/", Welcome);

app.listen(port, () => {
    console.log(`Server is running on the port ${port}`)
})