"use strict";

var mongoose = require('mongoose');

// create a schema
var userSchema = new mongoose.Schema({
    id: String,     // Unique ID identifying this user
    first_name: String, // First name of the user.
    last_name: String,  // Last name of the user.
    login_name: String,		//The identifier the user will type when logging in
    password_digest: String, //SHA-256 hash of the user's password'
    salt: String, //for SHA-256 digest
    pub_key: String //for encrypting messages
});


var User = mongoose.model('User', userSchema);
module.exports = User;
