require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const app = express();
const port = process.env.PORT || 4000;

const corsOptions = {
  origin: ["http://localhost:5173"],
  credentials: true,
  optionalSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  // verify the token
  jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

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
    const requestCollection = db.collection("food-request");
    const donationCollection = db.collection("donation");

    // jwt api
    app.post("/jwt", (req, res) => {
      const user = req.body;
      //create token
      const token = jwt.sign(user, process.env.SECRET_KEY, {
        expiresIn: "5h",
      });
      console.log(token);
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
          // secure: process.env.NODE.ENV === "production",
          // sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // //logout || clear cookie from browser
    app.post("/logout", (req, res) => {
      res
        .clearCookie("token", {
          // maxAge: 0,
          httpOnly: true,
          secure: false,

          // secure: process.env.NODE.ENV === "production",
          // sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

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
      const { searchParams } = req.query;
      const { sort } = req.query;
      let options = {};
      if (sort) {
        options = { sort: { expDate: sort === "asc" ? 1 : -1 } };
      }
      let query = { status: "available" };
      if (searchParams) {
        query = { name: { $regex: searchParams, $options: "i" } };
      }

      const result = await foodCollection.find(query, options).toArray();
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
      const sort = { quantity: -1 };
      const result = await foodCollection.find().sort(sort).limit(6).toArray();
      res.send(result);
    });

    //add food request api
    app.post("/addFoodRequest", async (req, res) => {
      const requestData = req.body;
      //0.
      const query = {
        donatorEmail: requestData.email,
        foodId: requestData.foodId,
      };
      const alreadyExist = await requestCollection.findOne(query);
      if (alreadyExist)
        return res.status(400).send("You have already request this food");
      //1.save food request

      const result = await requestCollection.insertOne(requestData);

      //2.change status in food collection
      const filter = { _id: new ObjectId(requestData.foodId) };
      const update = { $set: { status: "requested" } };
      const updateStatus = await foodCollection.updateOne(filter, update);

      res.send(result);
    });

    //manage my food by email filter
    app.get("/manageMyFood", verifyToken, async (req, res) => {
      const email = req.query.email;

      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const result = await foodCollection
        .find({ donatorEmail: email })
        .toArray();
      res.send(result);
    });

    //delete food from manageMyFood page
    app.delete("/food/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodCollection.deleteOne(query);
      res.send(result);
    });

    //update food
    app.put("/food/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const data = req.body;
      const updatedFood = {
        $set: {
          name: data?.name,
          quantity: data?.quantity,
          expDate: data?.expDate,
          pickLocation: data?.pickLocation,
        },
      };

      const result = await foodCollection.updateOne(query, updatedFood);
      res.send(result);
    });

    // my food request by email filter
    app.get("/foodRequest", async (req, res) => {
      const email = req.query.email;
      const result = await requestCollection
        .find({ donatorEmail: email })
        .toArray();
      res.send(result);
    });

    //delete food from foodRequest page
    app.delete("/foodRequest/:id", async (req, res) => {
      const id = req.params.id;
      const request = await requestCollection.findOne({
        _id: new ObjectId(id),
      });
      const filter = { _id: new ObjectId(request.foodId) };
      const update = { $set: { status: "available" } };
      const updateStatus = await foodCollection.updateOne(filter, update);

      const query = { _id: new ObjectId(id) };
      const result = await requestCollection.deleteOne(query);

      //2.change status in food collection

      res.send(result);
    });

    //top donator
    app.get("/top-donator", async (req, res) => {
      const sort = { quantity: -1 };
      const result = await foodCollection.find().sort(sort).limit(3).toArray();
      res.send(result);
    });

    //donation
    app.get("/donation", async (req, res) => {
      const result = await donationCollection.find().toArray();
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
