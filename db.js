// db.js
const mongoose = require("mongoose");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI);

const TokenSchema = new mongoose.Schema({
	token: String,
	expiresAt: Date,
});

module.exports = mongoose.model("Token", TokenSchema);
