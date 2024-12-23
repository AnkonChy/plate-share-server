const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 4000;

app.use(express.json());
app.use(cors());

async function run() {
  try {
    app.get("/", (req, res) => {
      res.send("Hello from plateshare");
    });
    console.log("db connected");
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log("server running");
});
