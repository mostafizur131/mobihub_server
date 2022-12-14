const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

app.get("/", async (req, res) => {
  res.send("MobiHub Server Running");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster1.b8fg4md.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

//Verify JWT
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

// verify admin
const verifyAdmin = async (req, res, next) => {
  const decodedEmail = req.decoded.email;
  const query = { email: decodedEmail };
  const user = await usersCollection.findOne(query);

  if (user?.role !== "admin") {
    return res.status(403).send({ message: "forbidden access" });
  }
  next();
};

async function run() {
  try {
    //Database Collections
    const categoriesCollections = client
      .db("mobiHub")
      .collection("categoriesCollection");
    const phonesCollections = client.db("mobiHub").collection("phones");
    const bookingsCollections = client.db("mobiHub").collection("bookings");
    const usersCollection = client.db("mobiHub").collection("users");

    // categories get api
    app.get("/categories", async (req, res) => {
      const query = {};
      const result = await categoriesCollections.find(query).toArray();
      res.send(result);
    });

    app.get("/category/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        category_id: id,
      };
      const result = await phonesCollections.find(query).toArray();
      res.send(result);
    });

    //booking get api
    app.get("/bookings", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const bookings = await bookingsCollections.find(query).toArray();
      res.send(bookings);
    });

    // bookings post api
    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      const query = {
        name: booking.name,
        email: booking.email,
      };
      const alreadyBooked = await bookingsCollections.find(query).toArray();

      if (alreadyBooked.length) {
        const message = `You already booked ${booking.name}`;
        return res.send({ acknowledged: false, message });
      }
      const result = await bookingsCollections.insertOne(booking);
      res.send(result);
    });

    // get token for user
    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "1d",
        });
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: "" });
    });
    //get all user
    app.get("/users", async (req, res) => {
      const query = {};
      const users = await usersCollection.find(query).toArray();
      res.send(users);
    });

    // admin check
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });

    //Save user
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    //update user
    app.put("/users/admin/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const option = { upsert: true };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc, option);
      res.send(result);
    });

    // products get api
    app.get("/products", verifyJWT, async (req, res) => {
      const query = {};
      const result = await phonesCollections.find(query).toArray();
      res.send(result);
    });

    // Products post api (Products information save to database)
    app.post("/products", verifyJWT, async (req, res) => {
      const product = req.body;
      const result = await phonesCollections.insertOne(product);
      res.send(result);
    });
    //Delete a product from database
    app.delete("/products/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await phonesCollections.deleteOne(filter);
      res.send(result);
    });
  } finally {
  }
}
run().catch((err) => console.log(err));

app.listen(port, () => {
  console.log(`MobiHub server running on port ${port}`);
});
