const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  listing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Listing",
    required: true
  },

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  userName: {
    type: String,
    required: true,
    trim: true,
    minlength: [3, "Name must be at least 3 characters long"],
    maxlength: [50, "Name cannot exceed 50 characters"]
  },

  email: {
    type: String,
    required: true,
    match: [/.+\@.+\..+/, "Please enter a valid email address"]
  },

  phone: {
    type: String,
    required: true,
    match: [/^[0-9]{10}$/, "Phone number must be exactly 10 digits"]
  },

  dateFrom: {
    type: Date,
    required: true
  },

  dateTo: {
    type: Date,
    required: true,
    validate: {
      validator: function (value) {
        return this.dateFrom ? value >= this.dateFrom : true;
      },
      message: "End date must be after start date"
    }
  },

  people: {
    type: Number,
    required: true,
    min: [1, "At least 1 person is required"],
    max: [20, "Cannot exceed 20 people per booking"]
  },

  specialRequests: {
    type: String,
    trim: true,
    maxlength: [300, "Special requests cannot exceed 300 characters"]
  },

  status: {
    type: String,
    enum: ["Pending", "Confirmed", "Rejected" , "Expired"],
    default: "Pending"
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Optional: Auto-expire old pending bookings after 7 days
bookingSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60, partialFilterExpression: { status: "Pending" } });

module.exports = mongoose.model("Booking", bookingSchema);
