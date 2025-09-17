require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");

const app = express();
const port = process.env.PORT || 4000;

console.log("Starting server...");
const publicPath = path.join(__dirname, "public");
console.log("Serving static files from:", publicPath);

// ✅ List files in public folder at startup for debugging
try {
  const files = fs.readdirSync(publicPath);
  console.log("Files in public folder:", files);
} catch (err) {
  console.error("❌ Could not read public folder:", err.message);
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(publicPath));

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
    console.log(`✅ User "${username}" logged in, redirecting to /dashboard`);
    res.redirect("/dashboard");
  } else {
    console.log(`❌ Failed login for "${username}"`);
    res
      .status(401)
      .send("<h2 style='color:red;'>Invalid credentials. <a href='/'>Try again</a></h2>");
  }
});

// ✅ Temporary plain-text dashboard route (debugging)
app.get("/dashboard", (req, res) => {
  console.log("📄 /dashboard route hit.");
  try {
    if (fs.existsSync(path.join(publicPath, "dashboard.html"))) {
      console.log("✅ dashboard.html FOUND, but sending debug text instead.");
    } else {
      console.warn("⚠️ dashboard.html NOT FOUND!");
    }
  } catch (err) {
    console.error("❌ Error checking dashboard.html:", err.message);
  }

  // Temporarily send plain text to verify routing works
  res.send("<h1>✅ /dashboard route is working (debug mode)</h1>");
});

// ✅ Mock /data endpoint
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

// ✅ Catch-all route: send index.html
app.get("*", (req, res) => {
  console.log("Catch-all route hit:", req.originalUrl);
  res.sendFile(path.join(publicPath, "index.html"));
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
