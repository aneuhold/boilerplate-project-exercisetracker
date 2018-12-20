/* eslint-disable prefer-promise-reject-errors */
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
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
const userSchema = new mongoose.Schema({ name: String });

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

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});
