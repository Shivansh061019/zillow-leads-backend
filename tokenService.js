// tokenService.js
const crypto = require("crypto");
const Token = require("./db");

function generateToken() {
	return crypto.randomBytes(16).toString("hex");
}

async function storeToken(token) {
	const expires = new Date(Date.now() + 1000 * 60 * 30); // expires in 30 mins
	await Token.create({ token, expiresAt: expires });
}

async function isTokenValid(token) {
	const match = await Token.findOne({ token, expiresAt: { $gt: new Date() } });
	return !!match;
}

module.exports = { generateToken, storeToken, isTokenValid };
