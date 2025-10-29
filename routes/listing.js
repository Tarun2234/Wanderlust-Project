const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const Listing = require("../models/listing.js");
const Booking = require("../models/Booking"); 
const { isLoggedIn, isOwner, validateListing } = require("../middleware.js");
const listingController = require("../controllers/listings.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });

///////////////////////////////////////////////////////
// 🏠 INDEX + CREATE
///////////////////////////////////////////////////////
router.route("/")
  .get(wrapAsync(listingController.index))
  .post(
    isLoggedIn,
    upload.single("listing[image]"),
    validateListing,
    wrapAsync(listingController.createListing)
  );

///////////////////////////////////////////////////////
// 🆕 NEW FORM
///////////////////////////////////////////////////////
router.get("/new", isLoggedIn, listingController.renderNewForm);

///////////////////////////////////////////////////////
// 🔍 SEARCH listings
///////////////////////////////////////////////////////
router.get("/search", wrapAsync(listingController.searchListings));

///////////////////////////////////////////////////////
// 🧩 FILTER by category
///////////////////////////////////////////////////////
router.post("/filter", wrapAsync(listingController.filterByCategory));

///////////////////////////////////////////////////////
// ✏️ EDIT form
///////////////////////////////////////////////////////
router.get("/:id/edit", isLoggedIn, isOwner, wrapAsync(listingController.renderEditForm));

///////////////////////////////////////////////////////
// 📍 SHOW + UPDATE + DELETE listing
///////////////////////////////////////////////////////
router.route("/:id")
  .get(wrapAsync(listingController.showListing))
  .put(
    isLoggedIn,
    isOwner,
    upload.single("listing[image]"),
    validateListing,
    wrapAsync(listingController.updateListings)
  )
  .delete(isLoggedIn, isOwner, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);

    if (!listing) {
      req.flash("error", "Listing not found");
      return res.redirect("/listings");
    }

    // Find all bookings related to this listing
    const bookings = await Booking.find({ listing: id });

    // ✅ Case 1: No bookings exist → Safe to delete
    if (bookings.length === 0) {
      await Listing.findByIdAndDelete(id);
      req.flash("success", "Listing deleted successfully.");
      return res.redirect("/listings");
    }

    // ✅ Case 2: Check if all bookings have ended (dateTo < current date)
    const now = new Date();
    const activeBookings = bookings.filter(b => new Date(b.dateTo) >= now);

    if (activeBookings.length > 0) {
      req.flash("error", "You cannot delete this listing until all bookings have ended.");
      return res.redirect(`/listings/${id}`);
    }

    // ✅ Case 3: All bookings are expired → Safe to delete
    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing deleted successfully as all bookings have ended.");
    res.redirect("/listings");
  }));

module.exports = router;
