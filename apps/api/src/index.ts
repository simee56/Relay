import "dotenv/config";
import express from "express";
import routes from "./routes";

const app = express();
app.use(express.json());
app.use(routes);

const PORT = Number(process.env.PORT ?? 4000);
app.listen(PORT, () => {
  console.log(`Relay API running: http://localhost:${PORT}`);
});