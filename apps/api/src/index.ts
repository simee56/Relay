import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import routes from "./routes";

const app = express();

app.use(
  cors({
    origin: process.env.DASHBOARD_ORIGIN ?? "http://localhost:5173",
    credentials: true, // lets the browser send the login cookie
  })
);
app.use(cookieParser()); 
app.use(express.json());
app.use(routes);

const PORT = Number(process.env.PORT ?? 4000);
app.listen(PORT, () => {
  console.log(`Relay API running: http://localhost:${PORT}`);
});