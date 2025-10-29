const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const Listing = require("../models/listing");
const { isLoggedIn, validateBooking } = require("../middleware.js");
const wrapAsync = require("../utils/wrapAsync.js");
const ExpressError = require("../utils/ExpressError.js");

// ------------------------------------------------------
// Show booking form for a specific listing
// ------------------------------------------------------
router.get("/:listingId/book", isLoggedIn, wrapAsync(async (req, res) => {
  const listing = await Listing.findById(req.params.listingId);
  if (!listing) {
    req.flash("error", "Listing not found");
    return res.redirect("/listings");
  }

  if (listing.roomsAvailable <= 0) {
    req.flash("error", "No rooms available for this listing.");
    return res.redirect(`/listings/${listing._id}`);
  }

  res.render("booking/book", { listing });
}));

// ------------------------------------------------------
// Handle new booking submission
// ------------------------------------------------------
router.post("/:listingId/book", isLoggedIn, validateBooking, wrapAsync(async (req, res) => {
  const { listingId } = req.params;
  const bookingData = req.body.booking;

  const listing = await Listing.findById(listingId);
  if (!listing) {
    req.flash("error", "Listing not found");
    return res.redirect("/listings");
  }

  if (listing.roomsAvailable <= 0) {
    req.flash("error", "Sorry, no rooms available for this listing.");
    return res.redirect(`/listings/${listingId}`);
  }

  const newBooking = new Booking({
    listing: listingId,
    user: req.user._id,
    userName: bookingData.userName,
    email: bookingData.email,
    phone: bookingData.phone,
    dateFrom: bookingData.dateFrom,
    dateTo: bookingData.dateTo,
    people: bookingData.people,
    specialRequests: bookingData.specialRequests
  });

  await newBooking.save();
  req.flash("success", "Booking request submitted successfully!");
  res.redirect("/bookings/myBookings");
}));

// ------------------------------------------------------
// User bookings
// ------------------------------------------------------
router.get("/myBookings", isLoggedIn, wrapAsync(async (req, res) => {
  const bookings = await Booking.find({ user: req.user._id })
    .populate("listing")
    .sort({ createdAt: -1 });
  res.render("booking/myBookings", { bookings });
}));

// ------------------------------------------------------
// Owner's booking requests
// ------------------------------------------------------
router.get("/requests", isLoggedIn, wrapAsync(async (req, res) => {
  const listings = await Listing.find({ owner: req.user._id });
  const listingIds = listings.map(l => l._id);
  const bookings = await Booking.find({ listing: { $in: listingIds } })
    .populate("listing user")
    .sort({ createdAt: -1 });
  res.render("booking/bookingRequests", { bookings });
}));

// ------------------------------------------------------
// Confirm booking
// ------------------------------------------------------
router.post("/:bookingId/confirm", isLoggedIn, wrapAsync(async (req, res) => {
  const booking = await Booking.findById(req.params.bookingId).populate("listing");
  if (!booking) {
    req.flash("error", "Booking not found");
    return res.redirect("/bookings/requests");
  }

  if (!booking.listing.owner.equals(req.user._id)) {
    req.flash("error", "You are not allowed to confirm this booking");
    return res.redirect("/bookings/requests");
  }

  if (booking.status === "Confirmed") {
    req.flash("info", "This booking is already confirmed.");
    return res.redirect("/bookings/requests");
  }

  const updatedListing = await Listing.findOneAndUpdate(
    { _id: booking.listing._id, roomsAvailable: { $gt: 0 } },
    { $inc: { roomsAvailable: -1 } },
    { new: true }
  );

  if (!updatedListing) {
    req.flash("error", "No rooms available to confirm this booking.");
    return res.redirect("/bookings/requests");
  }

  booking.status = "Confirmed";
  await booking.save();

  if (updatedListing.roomsAvailable === 0) {
    await Booking.updateMany(
      { listing: booking.listing._id, status: "Pending", _id: { $ne: booking._id } },
      { $set: { status: "Rejected" } }
    );
  }

  req.flash("success", "Booking confirmed successfully!");
  res.redirect("/bookings/requests");
}));

// ------------------------------------------------------
// Reject booking
// ------------------------------------------------------
router.post("/:bookingId/reject", isLoggedIn, wrapAsync(async (req, res) => {
  const booking = await Booking.findById(req.params.bookingId).populate("listing");
  if (!booking) {
    req.flash("error", "Booking not found");
    return res.redirect("/bookings/requests");
  }

  if (!booking.listing.owner.equals(req.user._id)) {
    req.flash("error", "You are not allowed to reject this booking");
    return res.redirect("/bookings/requests");
  }

  if (booking.status === "Confirmed") {
    await Listing.findByIdAndUpdate(booking.listing._id, { $inc: { roomsAvailable: 1 } });
  }

  booking.status = "Rejected";
  await booking.save();

  req.flash("success", "Booking has been rejected.");
  res.redirect("/bookings/requests");
}));

// ------------------------------------------------------
// ✅ Booking Confirmation Page (New Route)
// ------------------------------------------------------
router.get("/confirmation/:id", isLoggedIn, wrapAsync(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate("listing");
  
  if (!booking) {
    req.flash("error", "Booking not found!");
    return res.redirect("/bookings/myBookings");
  }

  // Ensure user can only see their own booking
  if (!booking.user.equals(req.user._id)) {
    req.flash("error", "You are not authorized to view this booking confirmation.");
    return res.redirect("/bookings/myBookings");
  }

  res.render("booking/bookingConfirmation", { booking });
}));

module.exports = router;
