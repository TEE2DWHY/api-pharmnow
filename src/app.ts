import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimiter from "express-rate-limit";
import errorHandler from "./middlewares/errorHandler";
import notFound from "./middlewares/notFound";
import routes from "./routes/index.routes";

const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(
  rateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100,
  })
);
app.use("/api", routes);
app.use(express.static("./public"));
app.use(errorHandler);
app.use(notFound);

export default app;

const PORT = process.env.PORT || 8000;
