const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/productDB";

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 3000,
    });

    console.log("MongoDB connected successfully");
    return true;
  } catch (error) {
    console.warn("MongoDB connection unavailable:", error.message);
    return false;
  }
};

module.exports = connectDB;
