import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import mongoose from "mongoose";
import crypto from "crypto";
import bcrypt from "bcrypt-nodejs";

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/auth";
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.Promise = Promise;
const User = mongoose.model("User", {
  name: {
    type: String,
    unique: true
  },
  email: {
    type: String,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString("hex")
  }
});
// this is a middleware that checks the accessToken finds a user that matches a registrated user

const authenticateUser = async (req, res, next) => {
  try {
    const user = await User.findOne({
      accessToken: req.header("Authorization")
    });
    if (user) {
      req.user = user;
      next();
    } else {
      res.status(401).json({ loggedOut: true });
    }
  } catch (err) {
    res
      .status(403)
      .json({ message: "access token missing or wrong", errors: err.errors });
  }
};
// Defines the port the app will run on. Defaults to 8080, but can be
// overridden when starting the server. For example:
//
//   PORT=9000 npm start
const port = process.env.PORT || 5000;
const app = express();
// Add middlewares to enable cors and json body parsing
app.use(cors());
app.use(bodyParser.json());

// register form
app.post("/", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    //the bcrypt.... makes the password stored on the database as an bcrypt hash value of the password
    //So we DON'T STORE PLAINTEXT PASSWORDS
    const user = new User({ name, email, password: bcrypt.hashSync(password) });
    user.save();
    //sucess= the json returns the users id and accesToken
    res.status(201).json({ id: user._id, accessToken: user.accessToken });
  } catch (err) {
    res
      .status(400)
      .json({ message: "Could not create user", errors: err.errors });
  }
});
// this was message authenticates the user you get error message in line 37 "invaild password"
app.get("/summary", authenticateUser);
app.get("/summary", (req, res) => {
  res.json({ message: "You have been authenticated. " });
});

//the log in .post
app.post("/signIn", async (req, res) => {
  //get the user from the DB checking by email & password
  const user = await User.findOne({ email: req.body.email });
  //if the user excisting and the password sent in json matches the DB password, the bcrypt checks if the crypted version is matchig
  if (user && bcrypt.compareSync(req.body.password, user.password)) {
    //the return will be user id and the accessToken
    res.json({ userId: user._id, accessToken: user.accessToken });
  } else {
    res.status(404).json({ notFound: true });
  }
});
// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
