const express = require("express");
const cors = require("cors");
const fs = require("fs");
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

// ✅ Middleware
const allowedOrigins = ["https://zillow-leads.netlify.app", "http://localhost:3000"];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST"],
  credentials: true,
}));

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ✅ Razorpay setup
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ✅ Rate Limiter
app.use(
  "/scrape",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: "Too many requests. Please try again later.",
  })
);

// ✅ Create Razorpay Order
app.post("/create-order", async (req, res) => {
  try {
    const options = {
      amount: 1500 * 100, // Rs. 1500
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };
    const order = await razorpay.orders.create(options);
    res.json({ orderId: order.id, key: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    console.error("❌ create-order error:", err.message, err.response?.data);
    res.status(500).json({ error: "Order creation failed", details: err.message });
  }
});

// ✅ Scraping and CSV Download
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

    const headers = "Address,Link,Agent Name,Phone,Email,Verification Result,Verification Score\n";
    const csv = rows.map((r) => r.map((field) => `"${field}"`).join(",")).join("\n");

    const filePath = `leads_${zip}.csv`;
    fs.writeFileSync(filePath, headers + csv);

    await appendLeadsToSheet(rows);
    res.download(filePath);
  } catch (err) {
    console.error("❌ scrape/:zip error:", err.message);
    res.status(500).json({ error: "Scraping failed." });
  }
});

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
