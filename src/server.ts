import chalk from "chalk";
import app from "./app";
import connect from "./db/connect.db";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 8000;

const start = async () => {
  console.log(chalk.blue("Starting Server..."));

  try {
    await connect(process.env.MONGODB_URI as string);
    console.log(chalk.green("✔ Successfully connected to MongoDB"));
    app.listen(PORT, () => {
      console.log(
        chalk.green(`🚀 Server is running on port ${PORT}`) +
          chalk.blue(` at http://localhost:${PORT}`)
      );
    });
  } catch (err) {
    console.error(chalk.red("❌ Error starting server:"), err);
  }
};

start();

export { app };
