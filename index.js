const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const { connectToMongoDB } = require("./connect");
const { restrictToLoggedinUserOnly, checkAuth } = require("./middlewares/auth");
const URL = require("./models/url");

const urlRoute = require("./routes/url");
const staticRoute = require("./routes/staticRouter");
const userRoute = require("./routes/user");

const app = express();
const PORT = 8000;

app.use(cookieParser());

connectToMongoDB(process.env.MONGODB ?? "mongodb://localhost:27017/short-url").then(() =>
  console.log("Mongodb connected")
);

app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
// PUBLIC: Short URL redirect route (must be before /url router and NOT protected)
app.get("/url/:shortId", async (req, res) => {
  const shortId = req.params.shortId;
  const entry = await URL.findOneAndUpdate(
    { shortId },
    {
      $push: {
        visitHistory: {
          timestamp: Date.now(),
        },
      },
    }
  );
  if (!entry) {
    return res.status(404).send("Short URL not found");
  }
  res.redirect(entry.redirectURL);
});

// PROTECTED: All other /url routes
app.use("/url", restrictToLoggedinUserOnly, urlRoute);

// User routes (login, signup, etc.)
app.use("/user", userRoute);

// Static routes (home, etc.)
app.use("/", checkAuth, staticRoute);

app.listen(PORT, () => console.log(`Server Started at PORT:${PORT}`));