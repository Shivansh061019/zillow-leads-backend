const axios = require("axios");
require("dotenv").config();

const HUNTER_API_KEY = process.env.HUNTER_API_KEY;

async function verifyEmail(email) {
	if (email === "N/A") return { result: "invalid", score: 0 };

	try {
		const response = await axios.get(
			"https://api.hunter.io/v2/email-verifier",
			{
				params: {
					email,
					api_key: HUNTER_API_KEY,
				},
			},
		);

		const { result, score } = response.data.data;
		return { result, score };
	} catch (err) {
		console.error(`Error verifying email: ${email}`, err.message);
		return { result: "error", score: 0 };
	}
}

module.exports = verifyEmail;
