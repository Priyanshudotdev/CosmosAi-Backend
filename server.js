import { config } from "dotenv";
config({
    path: "./.env",
});
import cors from "cors";
import express from "express";
import AIRoute from "./src/routes/aiBuilder.routes.js";

const app = express();

app.use(
    cors({
        origin: ["*", "http://localhost:5173"],
    }),
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/api/v1/ai", AIRoute);

const PORT = process.env.PORT || 4040;

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT} `);
});
