require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const port = process.env.PORT || 4000;

console.log("Starting server...");

// Debug: show public folder path
console.log("Serving static files from:", path.join(__dirname, "public"));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Simple user database
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

// Login route
app.post("/login", (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "").trim();

  if (users[username] === password) {
    res.redirect("/dashboard");
  } else {
    res
      .status(401)
      .send(
        "<h2 style='color:red;'>Invalid credentials. <a href='/'>Try again</a></h2>"
      );
  }
});

// Dashboard route
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// Mock /data endpoint for Render (no InfluxDB required)
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

// Health check route
app.get("/", (req, res) => {
  res.send("RIO Dashboard is running.");
});

// Catch-all route (for wrong URLs)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
