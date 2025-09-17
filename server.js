require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const { InfluxDB } = require("@influxdata/influxdb-client");

const app = express();
const port = 4000;

console.log("Starting server...");

// InfluxDB credentials
const url = "http://localhost:8086";
const token = process.env.INFLUX_TOKEN;
const org = "Process Team";
const bucket = "D61_New_DB";

const influxDB = new InfluxDB({ url, token });
const queryApi = influxDB.getQueryApi(org);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

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

app.post("/login", (req, res) => {
  const username = String(req.body.username).trim();
  const password = String(req.body.password).trim();

  if (users[username] === password) {
    res.sendFile(path.join(__dirname, "public", "dashboard.html"));
  } else {
    res.status(401).send("<h2 style='color:red;'>Invalid credentials. <a href='/'>Try again</a></h2>");
  }
});

app.get("/data", async (req, res) => {
  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: -1m)
      |> filter(fn: (r) =>
        r._measurement == "PLC_Tags" and
        (r._field == "Online_OEE" or
         r._field == "MachineSpeed" or
         r._field == "TotalProducts" or
         r._field == "TotalGoodProducts" or
         r._field == "TotalScrapProducts"))
      |> last()
  `;

  const data = {
    Online_OEE: null,
    MachineSpeed: null,
    TotalProducts: null,
    TotalGoodProducts: null,
    TotalScrapProducts: null,
  };

  try {
    await queryApi.queryRows(fluxQuery, {
      next(row, tableMeta) {
        const o = tableMeta.toObject(row);
        data[o._field] = o._value;
      },
      error(error) {
        console.error("Query error:", error);
        res.json({ error: error.message });
      },
      complete() {
        const scrapPercentage =
          data.TotalProducts && data.TotalScrapProducts
            ? ((data.TotalScrapProducts / data.TotalProducts) * 100).toFixed(2)
            : "N/A";

        const lineStatus =
          data.MachineSpeed && data.MachineSpeed > 1 ? "Running" : "Stopped";

        res.json({
          ...data,
          scrapPercentage,
          lineStatus,
        });
      },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    res.json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});