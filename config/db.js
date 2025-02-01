

const mongoose = require("mongoose");

// connect to the mongoDB collection

const connectDB = () => {
   mongoose
     .connect(process.env.MONGODB_URI)
    .then((res) =>
      console.log(
        `MongoDB Connected: ${res.connection.host}`
      )
    )
    .catch((err) => {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    });
};

module.exports = connectDB;
