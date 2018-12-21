/* eslint-disable no-underscore-dangle */
/* eslint-disable prefer-promise-reject-errors */
/* eslint-disable consistent-return */
/* eslint-disable no-prototype-builtins */
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const shortid = require('shortid');
require('dotenv').load();

const app = express();

mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track', {
  useMongoClient: true,
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(`${__dirname}/views/index.html`);
});

// Error Handling middleware
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  let errCode;
  let errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || 'Internal Server Error';
  }
  res.status(errCode).type('txt')
    .send(errMessage);
});

/**
* The schema for users in the MongoDB
* */
const userSchema = new mongoose.Schema({
  name: String,
  _id: {
    type: String,
    default: shortid.generate(),
  },
});

/**
 * The schema for excercises in the MongoDB
 */
const exerciseLogSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  _id: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  date: Date,
});

/**
 * The model for all exercise logs in the MongoDB
 */
const ExerciseLog = mongoose.model('ExerciseLog', exerciseLogSchema);

/**
* The model for all users in the MongoDB
* */
const User = mongoose.model('User', userSchema);

/**
* Checks if the given user exists and returns a promise which resolves to
* true if the user does not exist and throws an error otherwise.
* If the check was successful it w.
* If the check threw an error, it will reject with the error
* */
function userDoesNotExist(userName) {
  return new Promise((resolve, reject) => {
    User.findOne({ name: userName }, (err, doc) => {
      if (err) {
        reject(Error(err));
      } else if (doc == null) {
        resolve();
      } else {
        console.log('The user already exists');
        reject(Error('User already exists'));
      }
    });
  });
}

function getUserById(id) {
  return new Promise((resolve, reject) => {
    User.findById(id, (err, doc) => {
      if (err) {
        reject(Error(err));
      } else if (doc == null) {
        reject(Error('User was not found'));
      } else {
        resolve(doc);
      }
    });
  });
}

function validateNumber(numberString) {
  return new Promise((resolve, reject) => {
    const value = Number(numberString);
    if (!Number.isNaN(value)) {
      resolve(value);
    } else {
      reject(Error('Value is not a number'));
    }
  });
}

/**
 * Validates a given date string and if it is, returns that date object.
 * @param {String} dateString
 */
function validateDate(dateString) {
  return new Promise((resolve, reject) => {
    const newDate = new Date(dateString);
    // eslint-disable-next-line eqeqeq
    if (newDate == 'Invalid Date') {
      reject(Error('Invalid date'));
    }
    resolve(newDate);
  });
}

/**
 * Tests the mongoose query object for the below properties and if they are valid
 * then resolves the associated MongoDB documents.
 * query.userId
 * query.from
 * query.to
 * query.limit
 * @param {Object} query
 */
function queryExerciseLogs(query) {
  return new Promise((resolve, reject) => {
    if (!query.hasOwnProperty('userId')) {
      reject(Error('Please specify a user Id'));
    } else {
      // test if the user exists
      resolve(getUserById(query.userId));
    }
  }).then(() => {
    const promiseArray = [];
    // test each one of the from, to, and limit fields
    if (query.hasOwnProperty('from')) {
      promiseArray.push(
        validateDate(query.from).then(resultDate => ({ from: resultDate })),
      );
    }
    if (query.hasOwnProperty('to')) {
      promiseArray.push(
        validateDate(query.to).then(resultDate => ({ to: resultDate })),
      );
    }
    if (query.hasOwnProperty('limit')) {
      promiseArray.push(
        validateNumber(query.limit).then(resultValue => ({ limit: resultValue })),
      );
    }
    return Promise.all(promiseArray);
  });
}

function validateNewDate(dateString) {
  return new Promise((resolve, reject) => {
    let newDate;
    if (dateString === '') {
      newDate = new Date();
    } else {
      newDate = new Date(dateString);
    }
    // eslint-disable-next-line eqeqeq
    if (newDate == 'Invalid Date') {
      reject(Error('Invalid date, leave the date blank to use the current date'));
    }
    resolve(newDate);
  });
}


/**
* Creates a new user when posted to.
* The form data should look like:
* req.body.username
* */
app.post('/api/exercise/new-user', (req, res) => {
  userDoesNotExist(req.body.username).then(() => {
    const newUser = new User({
      name: req.body.username,
    });
    newUser.save();
    return newUser;
  }).then((newUser) => {
    res.json(newUser);
  }).catch((err) => {
    res.send(err.message);
  });
});

/**
* Lists all of the users in the MongoDB as an array
* */
app.get('/api/exercise/users', (req, res) => {
  User.find().then((result) => {
    res.json(result);
  });
});

/**
 * Adds an exercise to the user with the corresponding user ID.
 * The form data should look like:
 * req.body.userId
 * req.body.description
 * req.body.duration
 * req.body.date
 */
app.post('/api/exercise/add', (req, res) => {
  Promise.all([
    getUserById(req.body.userId),
    validateNewDate(req.body.date),
  ]).then((returnArray) => {
    const [selectedUser, newDate] = returnArray;
    const newLog = new ExerciseLog({
      _id: selectedUser._id,
      username: selectedUser.name,
      description: req.body.description,
      duration: req.body.duration,
      date: newDate,
    });
    newLog.save();
    res.json(newLog);
  }).catch((err) => {
    res.send(err.message);
  });
});

/**
 * Gets the exercise log for the given query.
 * The different query options are below:
 * req.query.userId
 */
app.get('/api/exercise/log', (req, res) => {
  queryExerciseLogs(req.query).then((docs) => {
    res.json(docs);
  }).catch((err) => {
    res.send(err.message);
    console.log(err);
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});
