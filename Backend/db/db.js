const mongoose = require('mongoose');


async function connectDB() {
  try{
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      heartbeatFrequencyMS: 10000,
    })
    console.log('Database Connected Successfully');
  }catch (error) {
    console.error('Database Connection Failed', error.message);
    process.exit(1);
  }
}


module.exports = connectDB;