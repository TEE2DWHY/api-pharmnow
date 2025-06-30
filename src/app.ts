import express from "express";
import connect from "./db/connect.db";
import cors from "cors";
import helmet from "helmet";
import rateLimiter from "express-rate-limit";
import errorHandler from "./middlewares/errorHandler";
import notFound from "./middlewares/notFound";
import configRouter from "./routes/config.routes";

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(
  rateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100,
  })
);
app.use(configRouter);
app.use(express.static("./public"));
app.use(errorHandler);
app.use(notFound);

const PORT = process.env.PORT || 8000;

const start = async () => {
  try {
    await connect(process.env.MONGODB_URI as string);
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.log(err);
  }
};
start();
