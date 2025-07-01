import app from "./app";
import connect from "./db/connect.db";

const PORT = process.env.PORT || 8000;

const start = async () => {
  try {
    await connect(process.env.MONGODB_URI as string);
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error(err);
  }
};

start();
