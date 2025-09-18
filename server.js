require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const { InfluxDB } = require("@influxdata/influxdb-client");

const app = express();
const port = process.env.PORT || 4000;

// --- Verify env variables ---
if (!process.env.INFLUX_URL || !process.env.INFLUX_TOKEN || !process.env.INFLUX_ORG || !process.env.INFLUX_BUCKET) {
  console.error("❌ Missing InfluxDB env variables. Check your .env file.");
  process.exit(1);
}

// --- InfluxDB client ---
const influx = new InfluxDB({
  url: process.env.INFLUX_URL,
  token: process.env.INFLUX_TOKEN,
});
const queryApi = influx.getQueryApi(process.env.INFLUX_ORG);

// --- Serve static files ---
const publicPath = path.join(__dirname, "public");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(publicPath));

console.log("🚀 Server started");
console.log("📂 Serving static files from:", publicPath);

// --- /data endpoint ---
app.get("/data", async (req, res) => {
  const fluxQuery = `
    from(bucket: "${process.env.INFLUX_BUCKET}")
      |> range(start: -5m)
      |> filter(fn: (r) => r._measurement == "PLC_Tags")
      |> pivot(rowKey:["_time"], columnKey:["_field"], valueColumn:"_value")
      |> sort(columns: ["_time"], desc: true)
      |> limit(n:1)
  `;

  try {
    const rows = [];
    const observer = {
      next(row, tableMeta) {
        const obj = tableMeta.toObject(row);
        console.log("🔍 Raw InfluxDB row:", obj);
        rows.push(obj);
      },
      error(error) {
        console.error("❌ InfluxDB query error:", error);
        res.status(500).json({ error: "InfluxDB query failed" });
      },
      complete() {
        console.log(`📊 Influx returned ${rows.length} rows`);

        if (rows.length === 0) {
          return res.json({
            Online_OEE: null,
            MachineSpeed: null,
            TotalProducts: null,
            TotalGoodProducts: null,
            TotalScrapProducts: null,
            scrapPercentage: null,
            lineStatus: "Stopped",
          });
        }

        const latest = rows[0];

        const total = Number(latest.TotalProducts ?? 0);
        const good = Number(latest.TotalGoodProducts ?? 0);
        const scrap = Number(latest.TotalScrapProducts ?? 0);
        const speed = Number(latest.MachineSpeed ?? 0);

        const scrapPercentage = total > 0 ? ((scrap / total) * 100).toFixed(2) : null;
        const lineStatus = speed > 0 ? "Running" : "Stopped";

        res.json({
          MachineSpeed: speed || null,
          Online_OEE: latest.OEE ?? null,
          TotalProducts: total || null,
          TotalGoodProducts: good || null,
          TotalScrapProducts: scrap || null,
          scrapPercentage,
          lineStatus,
        });
      },
    };

    queryApi.queryRows(fluxQuery, observer);
  } catch (err) {
    console.error("❌ /data error:", err);
    res.status(500).json({ error: "Failed to fetch data from InfluxDB" });
  }
});

// --- Login route ---
const users = {
  admin: "admin123",
  Operation1: "op1123",
  Operation2: "op2123",
};
app.post("/login", (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "").trim();
  if (users[username] === password) {
    res.redirect("/dashboard");
  } else {
    res.status(401).send("<h2 style='color:red;'>Invalid credentials. <a href='/'>Try again</a></h2>");
  }
});

// --- Dashboard route ---
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(publicPath, "dashboard.html"));
});

// --- Health check ---
app.get("/", (req, res) => {
  res.send("RIO Dashboard is running.");
});

// --- Catch-all ---
app.get("*", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

// --- Start server ---
app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
