// Polyfill fetch for Node.js (so we can use fetch in backend)
const fetch = require("node-fetch");
globalThis.fetch = fetch;

const Listing = require("../models/listing.js");
const Booking = require("../models/Booking.js");

///////////////////////////////////////////////////////
// 🏠 Display all listings
///////////////////////////////////////////////////////
module.exports.index = async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index.ejs", { allListings });
};

///////////////////////////////////////////////////////
// Filter listings by category
///////////////////////////////////////////////////////
module.exports.filterByCategory = async (req, res) => {
  try {
    const { category } = req.body;
    const allListings = await Listing.find({ category });
    res.render("listings/index.ejs", { allListings });
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong while filtering listings!");
    res.redirect("/listings");
  }
};

///////////////////////////////////////////////////////
// Search listings by title or location
///////////////////////////////////////////////////////
module.exports.searchListings = async (req, res) => {
  try {
    const query = req.query.query || "";
    const regex = new RegExp(query, "i");
    const allListings = await Listing.find({
      $or: [{ title: regex }, { location: regex }],
    });
    res.render("listings/index.ejs", { allListings });
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong with search!");
    res.redirect("/listings");
  }
};

///////////////////////////////////////////////////////
// Render form to create a new listing
///////////////////////////////////////////////////////
module.exports.renderNewForm = (req, res) => {
  res.render("listings/new.ejs");
};

///////////////////////////////////////////////////////
// Show a single listing + auto-expire old bookings
///////////////////////////////////////////////////////
module.exports.showListing = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id)
    .populate({ path: "reviews", populate: { path: "author" } })
    .populate("owner");

  if (!listing) {
    req.flash("error", "Listing you requested for does not exist!");
    return res.redirect("/listings");
  }

  // Auto-expire old confirmed bookings and free up rooms
  const today = new Date();
  const confirmedBookings = await Booking.find({
    listing: listing._id,
    status: "Confirmed",
  });

  let expiredCount = 0;

  for (let booking of confirmedBookings) {
    if (new Date(booking.dateTo) < today) {
      booking.status = "Expired";
      await booking.save();
      listing.roomsAvailable += 1;
      expiredCount++;
    }
  }

  if (expiredCount > 0) {
    await listing.save();
  }

  res.render("listings/show.ejs", { listing });
};

///////////////////////////////////////////////////////
// Create a new listing (with smart fallback geocoding)
///////////////////////////////////////////////////////
module.exports.createListing = async (req, res) => {
  try {
    const fullAddress = req.body.listing.location.trim();

    // Helper function to query Nominatim (OpenStreetMap)
    const fetchCoordinates = async (query) => {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`,
        {
          headers: {
            "User-Agent": "WanderlustApp (wanderlust.support@example.com)",
          },
        }
      );
      return await res.json();
    };

    // Try full address first
    let data = await fetchCoordinates(fullAddress);

    // If not found, try progressively simpler forms
    if (!data || data.length === 0) {
      const addressParts = fullAddress.split(",");
      for (let i = 0; i < addressParts.length - 1; i++) {
        const shorterQuery = addressParts.slice(i).join(",").trim();
        data = await fetchCoordinates(shorterQuery);
        if (data && data.length > 0) break;
      }
    }

    // Final fallback
    if (!data || data.length === 0) {
      req.flash("error", "Location not found. Please try a simpler location name!");
      return res.redirect("/listings/new");
    }

    // Create geometry for map
    const geometry = {
      type: "Point",
      coordinates: [parseFloat(data[0].lon), parseFloat(data[0].lat)],
    };

    const {
      title,
      description,
      price,
      country,
      location,
      category,
      roomsAvailable,
      phoneNumber,
      countryCode,
    } = req.body.listing;

    const newListing = new Listing({
      title,
      description,
      price,
      country,
      location,
      category,
      geometry,
      owner: req.user._id,
      roomsAvailable,
      phoneNumber,
      countryCode,
    });

    if (req.file) {
      newListing.image = {
        url: req.file.path,
        filename: req.file.filename,
      };
    }

    await newListing.save();
    req.flash("success", "New Listing Created!");
    res.redirect("/listings");
  } catch (err) {
    console.error("Geocoding error:", err);
    req.flash("error", "Something went wrong while fetching location!");
    res.redirect("/listings/new");
  }
};




///////////////////////////////////////////////////////
// Render edit form for a listing
///////////////////////////////////////////////////////
module.exports.renderEditForm = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);

  if (!listing) {
    req.flash("error", "Listing you requested for does not exist!");
    return res.redirect("/listings");
  }

  let originalImageUrl = listing.image.url;
  if (originalImageUrl.includes("/upload")) {
    originalImageUrl = originalImageUrl.replace("/upload", "/upload/h_100,w_250");
  }

  const isCloudinary = originalImageUrl.includes("cloudinary");
  res.render("listings/edit.ejs", { listing, originalImageUrl, isCloudinary });
};

///////////////////////////////////////////////////////
// Update a listing (with OpenStreetMap geocode)
///////////////////////////////////////////////////////
module.exports.updateListings = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      price,
      country,
      location,
      category,
      roomsAvailable,
      phoneNumber,
      countryCode,
    } = req.body.listing;

    // Fetch new geocode for updated location
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`
    );
    const data = await response.json();

    if (!data || data.length === 0) {
      req.flash("error", "Location not found. Please enter a valid location!");
      return res.redirect(`/listings/${id}/edit`);
    }

    const geometry = {
      type: "Point",
      coordinates: [parseFloat(data[0].lon), parseFloat(data[0].lat)],
    };

    // Update listing with new data and geometry
    const updatedListing = await Listing.findByIdAndUpdate(
      id,
      {
        title,
        description,
        price,
        country,
        location,
        category,
        roomsAvailable,
        geometry,
        phoneNumber,
        countryCode,
      },
      { new: true, runValidators: true }
    );

    if (req.file) {
      updatedListing.image = {
        url: req.file.path,
        filename: req.file.filename,
      };
      await updatedListing.save();
    }

    if (!updatedListing) {
      req.flash("error", "Listing not found");
      return res.redirect("/listings");
    }

    req.flash("success", "Listing Updated Successfully!");
    res.redirect(`/listings/${id}`);
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong while updating!");
    res.redirect("/listings");
  }
};

///////////////////////////////////////////////////////
// Delete a listing (only if no active bookings)
///////////////////////////////////////////////////////
module.exports.destroyListing = async (req, res) => {
  const { id } = req.params;

  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing not found");
    return res.redirect("/listings");
  }

  // Check all bookings for this listing
  const bookings = await Booking.find({ listing: id });
  const now = new Date();

  // Allow delete if:
  // 1. No bookings exist
  // 2. All bookings have expired (dateTo < today)
  if (bookings.length === 0) {
    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing deleted successfully (no bookings found).");
    return res.redirect("/listings");
  }

  const activeBookings = bookings.filter(b => new Date(b.dateTo) >= now);
  if (activeBookings.length > 0) {
    req.flash("error", "You cannot delete this listing until all bookings have ended.");
    return res.redirect(`/listings/${id}`);
  }

  await Listing.findByIdAndDelete(id);
  req.flash("success", "Listing deleted successfully (all bookings expired).");
  res.redirect("/listings");
};
