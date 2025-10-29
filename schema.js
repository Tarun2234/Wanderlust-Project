const Joi = require("joi");

// ------------------------------------------------------
// Listing Schema
// ------------------------------------------------------
module.exports.listingSchema = Joi.object({
  listing: Joi.object({
    title: Joi.string().required().messages({
      "string.empty": "Title cannot be empty",
      "any.required": "Title is required"
    }),

    description: Joi.string().required().messages({
      "string.empty": "Description cannot be empty",
      "any.required": "Description is required"
    }),

    image: Joi.object({
      filename: Joi.string().required().messages({
        "string.empty": "Filename cannot be empty",
        "any.required": "Filename is required"
      }),
      url: Joi.string().uri().allow("").messages({
        "string.uri": "Please enter a valid image URL"
      })
    }),

    price: Joi.number().min(0).required().messages({
      "number.base": "Price must be a number",
      "number.min": "Price cannot be negative",
      "any.required": "Price is required"
    }),

    country: Joi.string().required().messages({
      "string.empty": "Country cannot be empty",
      "any.required": "Country is required"
    }),

    location: Joi.string().required().messages({
      "string.empty": "Location cannot be empty",
      "any.required": "Location is required"
    }),

    category: Joi.string()
      .valid(
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
        "Iconic Cities"
      )
      .required()
      .messages({
        "any.only": "Please select a valid category",
        "any.required": "Category is required"
      }),

    roomsAvailable: Joi.number().integer().min(1).required().messages({
      "number.base": "Rooms available must be a number",
      "number.min": "Rooms available must be at least 1",
      "any.required": "Please specify how many rooms are available"
    })
  }).required()
});


// ------------------------------------------------------
// Review Schema
// ------------------------------------------------------
module.exports.reviewSchema = Joi.object({
  review: Joi.object({
    rating: Joi.number().required().min(1).max(5).messages({
      "number.base": "Rating must be a number",
      "number.min": "Rating must be at least 1",
      "number.max": "Rating cannot exceed 5",
      "any.required": "Rating is required"
    }),
    comment: Joi.string().required().messages({
      "string.empty": "Comment cannot be empty",
      "any.required": "Comment is required"
    })
  }).required()
});


// ------------------------------------------------------
// Booking Schema (Fixed)
// ------------------------------------------------------
module.exports.bookingSchema = Joi.object({
  booking: Joi.object({
    userName: Joi.string().required(),
    email: Joi.string().email().required(),
    phone: Joi.string().required(),
    dateFrom: Joi.string().required(),
    dateTo: Joi.string().required(),
    people: Joi.number().min(1).required(),
    specialRequests: Joi.string().allow(''),
    listingId: Joi.string().required()
  }).required()
});

