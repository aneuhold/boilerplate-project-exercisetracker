/* eslint-disable no-underscore-dangle */
/* eslint-disable prefer-promise-reject-errors */
/* eslint-disable consistent-return */
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const shortid = require('shortid');
require('dotenv').load();

const app = express();

mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(`${__dirname}/views/index.html`);
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
* Checks if the given user exists and returns a promise with the true or false result
* If the check was successful, it will resolve with true or false.
* If the check threw an error, it will reject with the error
* */
function userDoesNotExist(userName) {
  return new Promise((resolve, reject) => {
    User.findOne({ name: userName }).then((doc, err) => {
      if (err) {
        reject(err);
      } else if (doc == null) {
        resolve();
      } else {
        reject('Username already exists');
      }
    });
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
  }).catch((error) => {
    res.send(error);
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
  User.findOne({ _id: req.body.userId }).then((selectedUser) => {
    if (selectedUser != null) {
      return selectedUser;
    // eslint-disable-next-line no-else-return
    } else {
      res.send(`The user with the id of ${req.body.userId} was not found`);
    }
  }).then((selectedUser) => {
    let newDate = null;
    try {
      newDate = new Date(req.body.date);
    } catch (error) {
      newDate = new Date();
    }
    return [selectedUser, newDate];
  }).then((returnArray) => {
    const [selectedUser, newDate] = returnArray;
    const newLog = new ExerciseLog({
      _id: selectedUser._id,
      username: selectedUser.name,
      description: req.body.description,
      duration: req.body.duration,
      date: newDate,
    }, (err) => {
      if (err) {
        console.log(err);
      }
    });
    newLog.save();
    res.json(newLog);
  })
    .catch((err) => {
      res.send(err);
    });
});

// The post request occurs
// the user is found and if the user does not exist, it returns that error, if the user
// is found, then the user is passed on to the next function
// At that point the date is processed, after the date is processed the date is passed on
// with the user
// The new log is created and returned

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});
