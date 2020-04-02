const Event = require("../models/event");
const formidable = require("formidable");
const fs = require("fs");
const _ = require("lodash");

exports.eventById = (req, res, next, id) => {
  Event.findById(id)
    .populate("postedBy", "_id name")
    .populate("comments.postedBy", "_id name")
    .populate("postedBy", "_id name role")
    .select("_id title body created likes comments photo")
    .exec((err, event) => {
      if (err || !event) {
        return res.status(400).json({
          error: err
        });
      }
      req.event = event;
      next();
    });
};

exports.getEvent = (req, res) => {
  const events = Event.find()
    .populate("postedBy", "_id name")
    .populate("comments", "text created")
    .populate("comments.postedBy", "_id name")
    .select("_id title body created likes")
    .sort({ created: -1 })
    .then(events => {
      res.json(events);
    })
    .catch(err => console.log(err));
};

// with pagination
exports.getEvents = async (req, res) => {
  // get current page from req.query or use default value of 1
  const currentPage = req.query.page || 1;
  // return 3 eventss per page
  const perPage = 6;
  let totalItems;

  const events = await Event.find()
    // countDocuments() gives you total count of posts
    .countDocuments()
    .then(count => {
      totalItems = count;
      return Event.find()
        .skip((currentPage - 1) * perPage)
        .populate("comments", "text created")
        .populate("comments.postedBy", "_id name")
        .populate("postedBy", "_id name")
        .select("_id title body created likes")
        .limit(perPage)
        .sort({ created: -1 });
    })
    .then(events => {
      res.status(200).json(events);
    })
    .catch(err => console.log(err));
};

exports.createEvent = (req, res, next) => {
  let form = new formidable.IncomingForm();
  form.keepExtensions = true;
  form.parse(req, (err, fields, files) => {
    if (err) {
      return res.status(400).json({
        error: "Image could not be uploaded"
      });
    }
    let event = new Event(fields);

    req.profile.hashed_password = undefined;
    req.profile.salt = undefined;
    post.postedBy = req.profile;

    if (files.photo) {
      post.photo.data = fs.readFileSync(files.photo.path);
      post.photo.contentType = files.photo.type;
    }
    event.save((err, result) => {
      if (err) {
        return res.status(400).json({
          error: err
        });
      }
      res.json(result);
    });
  });
};

exports.postsByUser = (req, res) => {
  Event.find({ postedBy: req.profile._id })
    .populate("postedBy", "_id name")
    .select("_id title body created likes")
    .sort("_created")
    .exec((err, events) => {
      if (err) {
        return res.status(400).json({
          error: err
        });
      }
      res.json(events);
    });
};

exports.isPoster = (req, res, next) => {
  let sameUser =
    req.event && req.auth && req.event.postedBy._id == req.auth._id;
  let adminUser = req.event && req.auth && req.auth.role === "admin";

  // console.log("req.post ", req.post, " req.auth ", req.auth);
  // console.log("SAMEUSER: ", sameUser, " ADMINUSER: ", adminUser);

  let isPoster = sameUser || adminUser;

  if (!isPoster) {
    return res.status(403).json({
      error: "User is not authorized"
    });
  }
  next();
};

exports.updatePost = (req, res, next) => {
  let post = req.post;
  post = _.extend(post, req.body);
  post.updated = Date.now();
  post.save(err => {
    if (err) {
      return res.status(400).json({
        error: err
      });
    }
    res.json(post);
  });
};

exports.updateEvent = (req, res, next) => {
  let form = new formidable.IncomingForm();
  form.keepExtensions = true;
  form.parse(req, (err, fields, files) => {
    if (err) {
      return res.status(400).json({
        error: "Photo could not be uploaded"
      });
    }
    // save post
    let event = req.event;
    event = _.extend(event, fields);
    event.updated = Date.now();

    if (files.photo) {
      event.photo.data = fs.readFileSync(files.photo.path);
      event.photo.contentType = files.photo.type;
    }

    event.save((err, result) => {
      if (err) {
        return res.status(400).json({
          error: err
        });
      }
      res.json(event);
    });
  });
};

exports.deletePost = (req, res) => {
  let event = req.event;
  event.remove((err, event) => {
    if (err) {
      return res.status(400).json({
        error: err
      });
    }
    res.json({
      message: "Post deleted successfully"
    });
  });
};

exports.photo = (req, res, next) => {
  res.set("Content-Type", req.event.photo.contentType);
  return res.send(req.event.photo.data);
};

exports.singlePost = (req, res) => {
  return res.json(req.event);
};

exports.like = (req, res) => {
  Post.findByIdAndUpdate(
    req.body.eventId,
    { $push: { likes: req.body.userId } },
    { new: true }
  ).exec((err, result) => {
    if (err) {
      return res.status(400).json({
        error: err
      });
    } else {
      res.json(result);
    }
  });
};

exports.unlike = (req, res) => {
  Post.findByIdAndUpdate(
    req.body.eventId,
    { $pull: { likes: req.body.userId } },
    { new: true }
  ).exec((err, result) => {
    if (err) {
      return res.status(400).json({
        error: err
      });
    } else {
      res.json(result);
    }
  });
};

exports.comment = (req, res) => {
  let comment = req.body.comment;
  comment.postedBy = req.body.userId;

  Post.findByIdAndUpdate(
    req.body.eventId,
    { $push: { comments: comment } },
    { new: true }
  )
    .populate("comments.postedBy", "_id name")
    .populate("postedBy", "_id name")
    .exec((err, result) => {
      if (err) {
        return res.status(400).json({
          error: err
        });
      } else {
        res.json(result);
      }
    });
};

exports.uncomment = (req, res) => {
  let comment = req.body.comment;

  Post.findByIdAndUpdate(
    req.body.eventId,
    { $pull: { comments: { _id: comment._id } } },
    { new: true }
  )
    .populate("comments.postedBy", "_id name")
    .populate("postedBy", "_id name")
    .exec((err, result) => {
      if (err) {
        return res.status(400).json({
          error: err
        });
      } else {
        res.json(result);
      }
    });
};

// exports.updateComment = async (req, res) => {
//     const comment = req.body.comment;
//     // const id = req.body.id;
//     const postId = req.body.postId;
//     const userId = req.body.userId;
//     // comment.postedBy = req.body.userId;

//     const result = await Post.findByIdAndUpdate(
//         postId,
//         {
//             $set: {
//                 comments: {
//                     _id: comment._id,
//                     text: comment.text,
//                     postedBy: userId
//                 }
//             }
//         },
//         { new: true, overwrite: false }
//     )
//         .populate('comments.postedBy', '_id name')
//         .populate('postedBy', '_id name');
//     res.json(result);
// };

exports.updateComment = (req, res) => {
  let comment = req.body.comment;

  Post.findByIdAndUpdate(req.body.eventId, {
    $pull: { comments: { _id: comment._id } }
  }).exec((err, result) => {
    if (err) {
      return res.status(400).json({
        error: err
      });
    } else {
      Post.findByIdAndUpdate(
        req.body.eventId,
        { $push: { comments: comment, updated: new Date() } },
        { new: true }
      )
        .populate("comments.postedBy", "_id name")
        .populate("postedBy", "_id name")
        .exec((err, result) => {
          if (err) {
            return res.status(400).json({
              error: err
            });
          } else {
            res.json(result);
          }
        });
    }
  });
};

/*

// update commennt by Alaki
exports.updateComment = async (req, res) => {
  const commentId = req.body.id;
  const comment = req.body.comment;
 
  const updatedComment = await Post.updateOne(
    { comments: { $elemMatch: { _id: commentId } } },
    { $set: { "comments.$.text": comment } }
  );
  if (!updatedComment)
    res.status(404).json({ message: Language.fa.NoPostFound });
 
  res.json(updatedComment);
};

// update commennt with auth
exports.updateComment = async (req, res) => {
  const commentId = req.body.id;
  const comment = req.body.comment;
  const postId = req.params.id;
 
  const post = await Post.findById(postId);
  const com = post.comments.map(comment => comment.id).indexOf(commentId);
  const singleComment = post.comments.splice(com, 1);
  let authorized = singleComment[0].commentedBy;
  console.log("Security Check Passed ?", req.auth._id == authorized);
 
  if (authorized != req.auth._id)
    res.status(401).json({ mesage: Language.fa.UnAuthorized });
 
  const updatedComment = await Post.updateOne(
    { comments: { $elemMatch: { _id: commentId } } },
    { $set: { "comments.$.text": comment } }
  );
  if (!updatedComment)
    res.status(404).json({ message: Language.fr.NoPostFound });
 
  res.json({ message: Language.fr.CommentUpdated });
};
 */
