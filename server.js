require("dotenv").config();
const express    = require("express");
const bodyParser = require("body-parser");
const path       = require("path");
const { InfluxDB } = require("@influxdata/influxdb-client");

const app  = express();
const port = process.env.PORT || 4000;

// Env check
if (
  !process.env.INFLUX_URL ||
  !process.env.INFLUX_TOKEN ||
  !process.env.INFLUX_ORG ||
  !process.env.INFLUX_BUCKET
) {
  console.error("❌ Missing InfluxDB env variables. Check your .env file.");
  process.exit(1);
}

// Influx client
const influx   = new InfluxDB({
  url:   process.env.INFLUX_URL,
  token: process.env.INFLUX_TOKEN,
});
const queryApi = influx.getQueryApi(process.env.INFLUX_ORG);

// Static
const publicPath = path.join(__dirname, "public");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(publicPath));

// /data
app.get("/data", async (req, res) => {
  const fluxQuery = `
    from(bucket:"${process.env.INFLUX_BUCKET}")
      |> range(start:-5m)
      |> filter(fn:(r)=>r._measurement=="PLC_Tags")
      |> pivot(rowKey:["_time"], columnKey:["_field"], valueColumn:"_value")
      |> sort(columns:["_time"], desc:true)
      |> limit(n:1)
  `;
  try {
    const rows = [];
    const observer = {
      next(row, tableMeta) {
        rows.push(tableMeta.toObject(row));
      },
      error(err) {
        console.error("Influx error:", err);
        res.status(500).json({ error: "Influx query failed" });
      },
      complete() {
        const latest = rows[0] || {};
        const total = Number(latest.TotalProducts ?? 0);
        const good  = Number(latest.TotalGoodProducts ?? 0);
        const scrap = Number(latest.TotalScrapProducts ?? 0);
        const speed = Number(latest.MachineSpeed ?? 0);
        const scrapPercentage = total>0
          ? ((scrap/total)*100).toFixed(2)
          : null;
        const lineStatus = speed>1 ? "Running" : "Stopped";

        res.json({
          MachineSpeed:     speed || null,
          Online_OEE:       latest.Online_OEE ?? null,
          TotalProducts:    total || null,
          TotalGoodProducts:good  || null,
          TotalScrapProducts:scrap|| null,
          scrapPercentage,
          lineStatus,
        });
      }
    };
    queryApi.queryRows(fluxQuery, observer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error:"Failed to fetch data" });
  }
});

// Users
const users = {
  Mahmood:   "Mahmood123",
  Mohsen:    "Mohsen123",
  Mahdi:     "Mahdi123",
  Kazem:     "Kazem123",
  Mohamad:   "Mohamad123",
  Parisa:    "Parisa123",
  Reza:      "Reza123",
  Operation1:"op1123",
  Operation2:"op2123",
  Operation3:"op3123",
  Operation4:"op4123",
  Operation5:"op5123",
  Operation6:"op6123",
  admin:     "admin123",
};

app.post("/login", (req, res) => {
  const u = String(req.body.username||"");
  const p = String(req.body.password||"");
  if (users[u]===p) return res.redirect("/dashboard");
  res
   .status(401)
   .send("<h2 style='color:red;'>Invalid credentials. <a href='/'>Try again</a></h2>");
});

// Dashboard & catch-all
app.get("/dashboard", (req,res)=>{
  res.sendFile(path.join(publicPath,"dashboard.html"));
});
app.use((req,res)=>{
  res.sendFile(path.join(publicPath,"index.html"));
});

// Local dev only
if (require.main===module) {
  app.listen(port,()=>console.log(`Listening on http://localhost:${port}`));
}

module.exports = app;
