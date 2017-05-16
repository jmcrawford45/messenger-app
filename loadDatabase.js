"use strict";

/* jshint node: true */
/* global Promise */

/*
 * This Node.js program can be run with the command:
 *     node loadDatabase.js
 * be sure to have an instance of the MongoDB running.
 *
 * This script loads the data into the MongoDB database named 'messenger'.  In loads
 * into collections named User and Message. Any previous objects in those collections is discarded.
 *
 */

var messengerPassword = require('./messengerPassword');
var messenger = require('./messenger');

// We use the Mongoose to define the schema stored in MongoDB.
var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/messenger');

// Load the Mongoose schema for User and Message
var User = require('./schema/user.js');
var Message = require('./schema/message.js');
var SchemaInfo = require('./schema/schemaInfo.js');

var versionString = '1.0';

// We start by removing anything that existing in the collections.
var removePromises = [User.remove({}), SchemaInfo.remove({}), Message.remove({})];

Promise.all(removePromises).then(function () {

    // Load the users into the User schema.

    var userModels =  [
        {_id: "57231f1a30e4351f4e9f4bd7", first_name: "Jared", last_name: "Crawford"},
        {_id: "57231f1a30e4351f4e9f4bd8", first_name: "Jason", last_name: "Nurse"},
        {_id: "57231f1a30e4351f4e9f4bd9", first_name: "Ioannis", last_name: "Agrafiotis"}];
    var mapFakeId2RealId = {}; // Map from fake id to real Mongo _id
    var userPromises = userModels.map(function (user) {
        var newUser = {
            first_name: user.first_name,
            last_name: user.last_name,
            login_name: user.first_name.toLowerCase(),
        };
        var passwordEntry = messengerPassword.makePasswordEntry('weak');
        newUser.password_digest = passwordEntry.hash;
        newUser.salt = passwordEntry.salt;
        console.log('weak' + newUser.salt);
        newUser.pub_key = messenger.newRSA('weak' + newUser.salt).rsaPublicKey;

        return User.create(newUser, function (err, userObj) {
            if (err) {
                console.error('Error create user', err);
            } else {
                mapFakeId2RealId[user._id] = userObj._id;
                user._id = userObj._id;
                console.log('Adding user:', user.first_name + ' ' + user.last_name, ' with ID ',
                    user._id);
            }
        });
    });



    var allPromises = Promise.all(userPromises).then(function () {
        var messageModels = [
            {sender: userModels[0]._id, recipient: userModels[1]._id, encrypted: false, content: 'Hello'},
            {sender: userModels[1]._id, recipient: userModels[0]._id, encrypted: false, content: 'World'}
        ];

        var messagePromises = messageModels.map(function (message) {
            return Message.create(message, function (err, messageObj) {
                if (err) {
                    console.error('Error create message', err);
                } else {
                    console.log('Adding message from:', message.sender , ' to:' , message.recipient, ' content:', message.content);
                }
            });
        });
        return Promise.all(messagePromises).then(function () {
            // Create the SchemaInfo object
            return SchemaInfo.create({
                version: versionString
            }, function (err, schemaInfo) {
                if (err) {
                    console.error('Error create schemaInfo', err);
                } else {
                    console.log('SchemaInfo object created with version ', versionString);
                }
            });
        });
    });

    allPromises.then(function () {
        mongoose.disconnect();
    });
});
