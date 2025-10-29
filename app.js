if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const ExpressError = require("./utils/ExpressError.js");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

const databaseConnectionLink = process.env.ATLASDB_URL;

// ====== Database Connection (Optimized for Vercel) ======
const connectDB = async () => {
  if (global._mongooseConnection) {
    // 🔁 Reuse existing connection
    return global._mongooseConnection;
  }

  try {
    const db = await mongoose.connect(databaseConnectionLink, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    global._mongooseConnection = db;
    console.log("✅ MongoDB connected (persistent connection)");
    return db;
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
  }
};

connectDB();

// ====== App Configuration ======
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.engine("ejs", ejsMate);

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

// ====== Session Store ======
const store = MongoStore.create({
  mongoUrl: databaseConnectionLink,
  crypto: {
    secret: process.env.SECRET,
  },
  touchAfter: 24 * 3600, // 24 hours
});

store.on("error", (err) => {
  console.log("Error in Mongo session store:", err);
});

const sessionOptions = {
  store,
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
};

app.use(session(sessionOptions));
app.use(flash());

// ====== Passport Setup ======
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// ====== Flash + Current User Middleware ======
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next();
});

// ====== Routers ======
const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const bookingRoutes = require("./routes/bookings.js");

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);
app.use("/bookings", bookingRoutes);

// ====== Root Route ======
app.get("/", (req, res) => {
  res.redirect("/listings");
});

// ====== Catch-all for unmatched routes ======
app.use((req, res, next) => {
  next(new ExpressError(404, "Page Not Found!"));
});

// ====== Error Handler ======
app.use((err, req, res, next) => {
  const { statusCode = 500 } = err;
  if (!err.message) err.message = "Something went wrong!";
  res.status(statusCode).render("listings/error.ejs", { err });
});

// ====== Export app for Vercel ======
module.exports = app;
