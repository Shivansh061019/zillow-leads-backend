// server.js
const express = require("express");
const cors = require("cors");
const fs = require("node:fs");
const bodyParser = require("body-parser");
const rateLimit = require("express-rate-limit");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const dotenv = require("dotenv");
dotenv.config();

const appendLeadsToSheet = require("./googleSheets");
const scrapeZillow = require("./scraper");
const { generateToken, storeToken, isTokenValid } = require("./tokenService");
require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

// Razorpay configuration
const razorpay = new Razorpay({
	key_id: process.env.RAZORPAY_KEY_ID,
	key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use("/webhook", bodyParser.raw({ type: "application/json" }));

// Rate limiter for scrape route
app.use(
	"/scrape",
	rateLimit({
		windowMs: 15 * 60 * 1000,
		max: 10,
		message: "Too many requests. Please try again later.",
	}),
);

// Create Razorpay order
app.post("/create-order", async (req, res) => {
	try {
		const options = {
			amount: 1500 * 100, // ₹1500 in paise
			currency: "INR",
			receipt: `receipt_${Date.now()}`,
		};
		const order = await razorpay.orders.create(options);
		res.json({ orderId: order.id, key: process.env.RAZORPAY_KEY_ID });
	} catch (err) {
		console.error("❌ Razorpay order error:", err.message);
		res.status(500).json({ error: "Failed to create Razorpay order" });
	}
});

// Webhook to verify payment and issue token
app.post("/webhook", async (req, res) => {
	const signature = req.headers["x-razorpay-signature"];
	const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

	const body = req.body;
	const expectedSignature = crypto
		.createHmac("sha256", secret)
		.update(JSON.stringify(body))
		.digest("hex");

	if (signature !== expectedSignature) {
		console.error("❌ Invalid Razorpay webhook signature");
		return res.sendStatus(400);
	}

	if (body.event === "payment.captured") {
		const token = generateToken();
		await storeToken(token);
		console.log(`✅ Payment received. Token issued: ${token}`);
	}

	res.sendStatus(200);
});

// Protected lead scraper route
app.get("/scrape/:zip", async (req, res) => {
	const zip = req.params.zip;
	const token = req.query.token;

	if (!token || !(await isTokenValid(token))) {
		return res.status(403).json({ error: "Unauthorized or expired token." });
	}

	try {
		const rawData = await scrapeZillow(zip);
		const rows = rawData.map((d) => [
			d.address,
			d.link,
			d.agentName,
			d.phone,
			d.email,
			d.verificationResult || "N/A",
			d.verificationScore || 0,
		]);

		const headers =
			"Address,Link,Agent Name,Phone,Email,Verification Result,Verification Score\n";
		const csv = rows
			.map((r) => r.map((field) => `"${field}"`).join(","))
			.join("\n");
		const filePath = `leads_${zip}.csv`;

		fs.writeFileSync(filePath, headers + csv);
		await appendLeadsToSheet(rows);

		res.download(filePath);
	} catch (err) {
		console.error("❌ Scraping failed:", err.message);
		res.status(500).json({ error: "Scraping failed." });
	}
});

// Start server
app.listen(PORT, () => {
	console.log(`🚀 Server running at http://localhost:${PORT}`);
});
