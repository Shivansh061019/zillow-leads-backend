// db.js
const mongoose = require("mongoose");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
});

const TokenSchema = new mongoose.Schema({
	token: String,
	expiresAt: Date,
});

module.exports = mongoose.model("Token", TokenSchema);
