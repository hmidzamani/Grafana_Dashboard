// server.js

require("dotenv").config();
const express    = require("express");
const bodyParser = require("body-parser");
const path       = require("path");
const { InfluxDB } = require("@influxdata/influxdb-client");

const app  = express();
const port = process.env.PORT || 4000;

// ── Health-check probes (Express v5 wildcard fix) ───────────────────────────
app.options("/*splat", (_req, res) => res.sendStatus(200));
app.head("/*splat",    (_req, res) => res.sendStatus(200));

// ── Verify InfluxDB env variables ───────────────────────────────────────────
if (
  !process.env.INFLUX_URL ||
  !process.env.INFLUX_TOKEN ||
  !process.env.INFLUX_ORG ||
  !process.env.INFLUX_BUCKET
) {
  console.error("❌ Missing InfluxDB env variables. Check your .env file.");
  process.exit(1);
}

// ── InfluxDB client ─────────────────────────────────────────────────────────
const influx   = new InfluxDB({
  url:   process.env.INFLUX_URL,
  token: process.env.INFLUX_TOKEN,
});
const queryApi = influx.getQueryApi(process.env.INFLUX_ORG);

// ── Static files ────────────────────────────────────────────────────────────
const publicPath = path.join(__dirname, "public");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(publicPath));

console.log("🚀 Server initialized");
console.log("📂 Serving static files from:", publicPath);

// ── /data endpoint ──────────────────────────────────────────────────────────
app.get("/data", async (req, res) => {
  const fluxQuery = `
    from(bucket:"${process.env.INFLUX_BUCKET}")
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
        rows.push(tableMeta.toObject(row));
      },
      error(err) {
        console.error("❌ InfluxDB query error:", err);
        res.status(500).json({ error: "InfluxDB query failed" });
      },
      complete() {
        if (rows.length === 0) {
          return res.json({
            Online_OEE:         null,
            MachineSpeed:       null,
            TotalProducts:      null,
            TotalGoodProducts:  null,
            TotalScrapProducts: null,
            scrapPercentage:    null,
            lineStatus:         "Stopped",
          });
        }

        const latest = rows[0];
        const total  = Number(latest.TotalProducts     ?? 0);
        const good   = Number(latest.TotalGoodProducts ?? 0);
        const scrap  = Number(latest.TotalScrapProducts?? 0);
        const speed  = Number(latest.MachineSpeed      ?? 0);

        const scrapPercentage = total > 0
          ? ((scrap / total) * 100).toFixed(2)
          : null;
        const lineStatus = speed > 1 ? "Running" : "Stopped";

        res.json({
          MachineSpeed:       speed || null,
          Online_OEE:         latest.Online_OEE ?? null,
          TotalProducts:      total || null,
          TotalGoodProducts:  good  || null,
          TotalScrapProducts: scrap || null,
          scrapPercentage,
          lineStatus,
        });
      }
    };
    queryApi.queryRows(fluxQuery, observer);
  } catch (err) {
    console.error("❌ /data error:", err);
    res.status(500).json({ error: "Failed to fetch data from InfluxDB" });
  }
});

// ── User credentials ────────────────────────────────────────────────────────
const users = {
  Mahmood:    "Mahmood123",
  Mohsen:     "Mohsen123",
  Mahdi:      "Mahdi123",
  Kazem:      "Kazem123",
  Mohamad:    "Mohamad123",
  Parisa:     "Parisa123",
  Reza:       "Reza123",
  Operation1: "op1123",
  Operation2: "op2123",
  Operation3: "op3123",
  Operation4: "op4123",
  Operation5: "op5123",
  Operation6: "op6123",
  admin:      "admin123",
};

// ── Login route ─────────────────────────────────────────────────────────────
app.post("/login", (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "").trim();
  if (users[username] === password) {
    return res.redirect("/dashboard");
  }
  res
    .status(401)
    .send("<h2 style='color:red;'>Invalid credentials. <a href='/'>Try again</a></h2>");
});

// ── Dashboard route ─────────────────────────────────────────────────────────
app.get("/dashboard", (_req, res) => {
  res.sendFile(path.join(publicPath, "dashboard.html"));
});

// ── Root route ──────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

// ── Catch-all route (no override) ───────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).send("Page not found");
});

// ── Start server ────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(port, "0.0.0.0", () => {
    console.log(`✅ Server running on http://0.0.0.0:${port}`);
  });
}

module.exports = app;
