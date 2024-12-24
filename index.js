require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ri84s.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const db = client.db("plate-share");
    const foodCollection = db.collection("foods");

    app.get("/", (req, res) => {
      res.send("Hello from plateshare");
    });

    //add a food api
    app.post("/add-food", async (req, res) => {
      const foodData = req.body;
      const result = await foodCollection.insertOne(foodData);
      res.send(result);
    });

    //show all avaiable food
    app.get("/all-available-foods", async (req, res) => {
      const result = await foodCollection.find().toArray();
      res.send(result);
    });

    //food details api
    app.get("/food/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodCollection.findOne(query);
      res.send(result);
    });

    //featured food in home with 6 value sort by quantity
    app.get("/featured-foods", async (req, res) => {
      const sort = { quantity: 1 };
      const result = await foodCollection.find().sort(sort).limit(6).toArray();
      res.send(result);
    });

    console.log("db connected");
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log("server running");
});
