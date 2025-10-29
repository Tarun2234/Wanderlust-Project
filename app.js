// ✅ Load environment variables (only in development)
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

///////////////////////////////////////////////////////
// 📦 Imports
///////////////////////////////////////////////////////
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

///////////////////////////////////////////////////////
// 🌍 Database Connection (Optimized for Vercel + Local)
///////////////////////////////////////////////////////
const databaseConnectionLink =
  process.env.ATLASDB_URL ||
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/wanderlust"; // ✅ safer localhost fallback

const connectDB = async () => {
  if (global._mongooseConnection) {
    return global._mongooseConnection; // reuse existing connection
  }

  try {
    const db = await mongoose.connect(databaseConnectionLink, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // helps prevent hanging
    });
    global._mongooseConnection = db;
    console.log("✅ MongoDB connected successfully!");
    return db;
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    throw err;
  }
};

connectDB().catch((err) => {
  console.error("Fatal DB connection error. Exiting.", err);
  process.exit(1);
});

///////////////////////////////////////////////////////
// ⚙️ App Configuration
///////////////////////////////////////////////////////
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.engine("ejs", ejsMate);

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));

console.log("🚀 APP STARTED — NODE_ENV:", process.env.NODE_ENV || "undefined");

///////////////////////////////////////////////////////
// 💾 Session Configuration
///////////////////////////////////////////////////////
const store = MongoStore.create({
  mongoUrl: databaseConnectionLink,
  crypto: {
    secret: process.env.SECRET || "keyboardcat",
  },
  touchAfter: 24 * 3600, // update once per day
});

store.on("error", (err) => {
  console.error("❌ Session store error:", err);
});

const sessionOptions = {
  store,
  secret: process.env.SECRET || "keyboardcat",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 1 week
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
};

app.use(session(sessionOptions));
app.use(flash());

///////////////////////////////////////////////////////
// 🔐 Passport Authentication
///////////////////////////////////////////////////////
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

///////////////////////////////////////////////////////
// ✉️ Flash + Current User Middleware
///////////////////////////////////////////////////////
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next();
});

///////////////////////////////////////////////////////
// 🛣️ Routes
///////////////////////////////////////////////////////
const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const bookingRouter = require("./routes/bookings.js");

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);
app.use("/bookings", bookingRouter);

///////////////////////////////////////////////////////
// 🏠 Root Route
///////////////////////////////////////////////////////
app.get("/", (req, res) => {
  res.redirect("/listings");
});

///////////////////////////////////////////////////////
// ❌ 404 Handler
///////////////////////////////////////////////////////
// ✅ Compatible 404 handler for Express v5
app.use((req, res, next) => {
  next(new ExpressError(404, "Page Not Found!"));
});


///////////////////////////////////////////////////////
// ⚠️ Global Error Handler
///////////////////////////////////////////////////////
app.use((err, req, res, next) => {
  const { statusCode = 500 } = err;
  if (!err.message) err.message = "Something went wrong!";
  console.error("Error Handler:", err);
  res.status(statusCode).render("listings/error.ejs", { err });
});

///////////////////////////////////////////////////////
// ✅ Export for Vercel + Local
///////////////////////////////////////////////////////
module.exports = app;

// Optional — start server locally (ignored by Vercel)
if (require.main === module) {
  const port = process.env.PORT || 8080;
  app.listen(port, () => {
    console.log(`🌐 Server running on http://localhost:${port}`);
  });
}
