const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review.js");

const listingSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,

  image: {
    filename: {
      type: String,
      default: "listingimage",
    },
    url: {
      type: String,
      default:
        "https://images.unsplash.com/photo-1757503745964-c76d18d947e4?w=500&auto=format&fit=crop&q=60",
      set: (v) =>
        v === ""
          ? "https://images.unsplash.com/photo-1757503745964-c76d18d947e4?w=500&auto=format&fit=crop&q=60"
          : v,
    },
  },

  price: {
    type: Number,
    required: true,
    min: 0,
  },

  location: {
    type: String,
    required: true,
  },

  country: {
    type: String,
    required: true,
  },

  category: {
    type: String,
    enum: [
      "Mountains",
      "Beaches",
      "Cities",
      "Castles",
      "Pools",
      "Camping",
      "Farms",
      "Arctic",
      "Trending",
      "Rooms",
      "Iconic Cities",
    ],
    required: true,
  },

  roomsAvailable: {
    type: Number,
    required: true,
    min: 0,
    default: 1,
  },

  reviews: [
    {
      type: Schema.Types.ObjectId,
      ref: "Review",
    },
  ],

  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },

  phoneNumber: {
    type: String,
    trim: true,
    match: [
      /^\+?\d{7,15}$/,
      "Please enter a valid phone number (e.g., +14155552671)",
    ],
  },

  countryCode: {
    type: String,
    trim: true,
  },

  geometry: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point", // ✅ Always defined
    },
    coordinates: {
      type: [Number],
      default: [0, 0], // ✅ Safe fallback if location fetch fails
    },
  },
});

// ====== Cascade delete reviews when listing deleted ======
listingSchema.post("findOneAndDelete", async (listing) => {
  if (listing) {
    await Review.deleteMany({ _id: { $in: listing.reviews } });
  }
});

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;
