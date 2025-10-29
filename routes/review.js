const express = require("express");
const router = express.Router({ mergeParams: true }); // important to access :id from parent route
const wrapAsync = require("../utils/wrapAsync.js");
const ExpressError = require("../utils/ExpressError.js");
const Review = require("../models/review.js");
const Listing = require("../models/listing.js");
const { validateReview, isLoggedIn, isReviewAuthor } = require("../middleware.js");
const reviewController = require("../controllers/reviews.js");


// POST Review
router.route("/")
    .post(isLoggedIn, validateReview, wrapAsync(reviewController.createReview));

// DELETE Review
router.route("/:reviewId")
    .delete(isLoggedIn, isReviewAuthor, wrapAsync(reviewController.destroyReview));

module.exports = router;
