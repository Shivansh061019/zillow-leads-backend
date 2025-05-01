const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const Razorpay = require("razorpay");
const fs = require("fs");
const bodyParser = require("body-parser");
const path = require("path");

const connectDB = require("./db");
const verifyEmail = require("./verifyEmail");
const { generateToken, storeToken, isTokenValid } = require("./tokenService");
const scrapeZillowLeads = require("./scraper");

dotenv.config();
connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all origins (or specify Netlify domain for tighter security)
app.use(cors({ origin: "*" }));

app.use(bodyParser.json());
app.use(express.static("public"));

// Razorpay setup
const razorpay = new Razorpay({
	key_id: process.env.RAZORPAY_KEY_ID,
	key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ---------------------- ROUTES ----------------------

// ✅ Health check
app.get("/", (req, res) => {
	res.send("Zillow Lead Scraper Backend is running!");
});

// ✅ Create Razorpay order
app.post("/create-order", async (req, res) => {
	try {
		const options = {
			amount: 29900, // ₹299.00
			currency: "INR",
			receipt: `order_rcptid_${Date.now()}`,
		};
		const order = await razorpay.orders.create(options);
		res.json(order);
	} catch (error) {
		console.error("❌ create-order error:", error);
		res.status(500).json({ error: "Order creation failed" });
	}
});

// ✅ Razorpay Webhook
app.post("/verify-payment", async (req, res) => {
	try {
		const paymentData = req.body;

		// Log incoming webhook (optional)
		console.log("✅ Webhook received:", paymentData);

		// Verify if Razorpay signature is valid (optional security)
		// Note: add webhook secret logic if needed here

		// Trigger your Zillow scrape logic
		const leads = await scrapeZillowLeads(); // make sure this returns data
		const timestamp = Date.now();
		const filePath = path.join(__dirname, `leads_${timestamp}.csv`);

		const csvContent = leads.map((lead) => Object.values(lead).join(",")).join("\n");
		fs.writeFileSync(filePath, csvContent);

		res.status(200).json({ message: "Payment verified and CSV created", file: filePath });
	} catch (err) {
		console.error("❌ verify-payment error:", err);
		res.status(500).json({ error: "Webhook processing failed" });
	}
});

// ----------------------------------------------------

app.listen(PORT, () => {
	console.log(`🚀 Server running at http://localhost:${PORT}`);
});
