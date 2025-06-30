import mongoose from "mongoose";

const connect = async (url: string) => {
  try {
    await mongoose.connect(url);
  } catch (error: any) {
    console.log(error.message);
  }
};

export default connect;
