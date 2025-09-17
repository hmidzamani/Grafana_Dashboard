require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const port = process.env.PORT || 4000;

console.log("Starting server...");
console.log("Serving static files from:", path.join(__dirname, "public"));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public"))); // serve index.html, style.css, etc.

// ✅ Simple user database
const users = {
  Mahmood: "mahmood123",
  Mohsen: "mohsen123",
  Mahdi: "mahdi123",
  Kazem: "kazem123",
  Mohamad: "mohamad123",
  Parisa: "parisa123",
  Reza: "reza123",
  Operation1: "op1123",
  Operation2: "op2123",
  Operation3: "op3123",
  Operation4: "op4123",
  Operation5: "op5123",
  Operation6: "op6123",
  admin: "admin123",
};

// ✅ Login route (redirect to /dashboard)
app.post("/login", (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "").trim();

  if (users[username] === password) {
    console.log(`✅ User "${username}" logged in`);
    res.redirect("/dashboard");
  } else {
    console.log(`❌ Failed login for "${username}"`);
    res
      .status(401)
      .send("<h2 style='color:red;'>Invalid credentials. <a href='/'>Try again</a></h2>");
  }
});

// ✅ Explicit dashboard route (MUST be above catch-all)
app.get("/dashboard", (req, res) => {
  console.log("Serving dashboard.html");
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// ✅ Temporary debug route (to confirm file exists)
app.get("/test-dashboard", (req, res) => {
  console.log("Serving test-dashboard route");
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// ✅ Mock /data endpoint (no InfluxDB needed)
app.get("/data", (req, res) => {
  res.json({
    Online_OEE: 87.5,
    MachineSpeed: 250,
    TotalProducts: 1234,
    TotalGoodProducts: 1180,
    TotalScrapProducts: 54,
    scrapPercentage: 4.37,
    lineStatus: "Running",
  });
});

// ✅ Health check route
app.get("/", (req, res) => {
  res.send("RIO Dashboard is running.");
});

// ✅ Catch-all: redirect unknown URLs to index.html
app.get("*", (req, res) => {
  console.log("Catch-all route hit:", req.originalUrl);
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
