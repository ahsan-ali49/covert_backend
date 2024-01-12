const asyncErrorHandler = require("../middlewares/asyncErrorHandler");
const Blog = require("../models/blogModel");
const Category = require('../models/categoryModel');
const ErrorHandler = require("../utils/errorHandler");

const cloudinary = require("cloudinary");
const SearchFeatures = require("../utils/searchFeatures");
const { deleteOldImages } = require("./propertyController");

// Create New Order
exports.createBlog = asyncErrorHandler(async (req, res, next) => {
  try {
    let body = JSON.parse(req.body.data);
    let user = req.user;

    console.log('body: ', body);

    body.cover = req.files['cover'][0]

    body.user = user.id;

    const blog = await Blog.create(body);

    blog.tags.forEach(async (tag) => {
      let category = await Category.findOneAndUpdate({ name: tag }, { $push: { blogs: blog._id } }, {
        new: true,
        runValidators: true,
        useFindAndModify: false,
      });
      console.log('category: ', category);
    })

    res.status(201).json({
      success: true,
      blog,
    });
  } catch (error) {
    console.error("Error creating blog:", error.message);

    res.status(500).json({
      success: false,
      error: "Error creating blog",
    });
  }
});

// Get Single Order Details
exports.getBlogDetails = asyncErrorHandler(async (req, res, next) => {
  const blog = await Blog.findById(req.params.id)
    .populate("user")
    .populate("tags")

  if (!blog) {
    return next(new ErrorHandler("Blog Not Found", 404));
  }

  res.status(200).json({
    blog,
  });
});

// Get Logged In User Orders
// exports.myOrders = asyncErrorHandler(async (req, res, next) => {
//   const orders = await Order.find({ user: req.user._id });

//   if (!orders) {
//     return next(new ErrorHandler("Order Not Found", 404));
//   }

//   res.status(200).json({
//     success: true,
//     orders,
//   });
// });

// Get All Orders ---ADMIN
exports.getBlogs = asyncErrorHandler(async (req, res, next) => {

  const resultPerPage = 12;
  const propertiesCount = await Blog.countDocuments();

  const searchFeature = new SearchFeatures(Blog.find({}).select({"title": 1, "cover": 1}).populate("tags"), req.query)
    .search()
    .filter();

  let blogs = await searchFeature.query;
  let filteredPropertiesCount = blogs.length;

  searchFeature.pagination(resultPerPage);

  blogs = await searchFeature.query.clone();

  res.status(200).json({
    success: true,
    blogs,
    propertiesCount,
    resultPerPage,
    filteredPropertiesCount,
  });
});

// Update Order Status ---ADMIN
exports.updateBlog = asyncErrorHandler(async (req, res, next) => {
  try {
    let { id } = req.params;
    let blog = await Blog.findById({ _id: id });
    if (!blog) {
      return next(new ErrorHandler("Blog Not Found(Bachayi)", 404));
    }

    // console.log('body: ', req.body);
    let body = JSON.parse(req.body.data);
    // let user = req.user;

    let image = req?.files?.cover
    if (image) {
      body.cover = image[0]
      deleteOldImages([blog.cover])
    }

    // console.log('body: ', body);
    let deletedOld = blog.tags.filter((e) => !body.tags.includes(e))
    let newTags = body.tags.filter((e) => !blog.tags.includes(e))

    newTags.forEach(async (tag) => {
      let category = await Category.findOneAndUpdate({ name: tag }, { $push: { blogs: blog._id } }, {
        new: true,
        runValidators: true,
        useFindAndModify: false,
      });
      console.log('new category: ', category);
    })

    newTags.forEach(async (tag) => {
      let category = await Category.findOneAndUpdate({ name: tag }, { $pull: { blogs: blog._id } }, {
        new: true,
        runValidators: true,
        useFindAndModify: false,
      });
      console.log('old category: ', category);
    })


    console.log('blog body: ', body);
    blog = await Blog.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
      useFindAndModify: false,
    })
    res.status(201).json({
      success: true,
      blog,
    });
  } catch (error) {
    console.error("Error creating blog:", error.message);

    res.status(500).json({
      success: false,
      error: "Error creating blog",
    });
  }
});
// // Delete Order ---ADMIN
exports.deleteBlog = asyncErrorHandler(async (req, res, next) => {
  try {
    const post = await Blog.findOne({ _id: req.params.id });
    console.log("Post:", post);
    if (post) {
      try {
        const result = await cloudinary.v2.uploader.destroy(
          post.image.public_id
        );
        console.log("Image deleted from Cloudinary:", result);
      } catch (error) {
        console.error("Error deleting image from Cloudinary:", error);
      }
      const result = await Blog.deleteOne({ _id: req.params.id });
      if (result.acknowledged) {
        res.status(201).json({
          success: true,
          blog: post
        });
      }
    } else {
      return next(new ErrorHandler("Blog Not Found(Bachayi)", 404));
    }
  } catch (error) {
    return next(new ErrorHandler("Error While deleteing Blog", 404));
  }
});
