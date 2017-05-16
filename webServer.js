"use strict";

/* jshint node: true */

/*
 *
 * To start the webserver run the command:
 *    node webServer.js
 *
 * Note that anyone able to connect to localhost:portNo will be able to fetch any file accessible
 * to the current user in the current directory or any of its children.
 *
 */

var mongoose = require('mongoose');
var async = require('async');



// Load the Mongoose schema for User, Message, and SchemaInfo
var User = require('./schema/user.js');
var Message = require('./schema/message.js');
var SchemaInfo = require('./schema/schemaInfo.js');

var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var multer = require('multer');
var app = express();
var fs = require('fs');

//Crypto modules
var messengerPassword = require('./messengerPassword');
var messenger = require('./messenger');
app.use(express.static(__dirname));
app.use(session({secret: 'secretKey', resave: false, saveUninitialized: false}));
app.use(bodyParser.json());

mongoose.connect('mongodb://localhost/messenger');



app.get('/', function (request, response) {
    if (request.session.login_name === undefined) {
        response.status(401).send('You must login to continue.');
        return;
    }
    response.send('Simple web server of files from ' + __dirname);
});

/*
 * URL /schema - Return app version number
 */
app.get('/schema', function (request, response) {
    SchemaInfo.find({}, function (err, info) {
        if (err) {
            console.error('Doing /schema error:', err);
            response.status(500).send(JSON.stringify(err));
            return;
        }
        if (info.length === 0) {
            // Query didn't return an error but didn't find the SchemaInfo object - This
            // is also an internal error return.
            response.status(500).send('Missing SchemaInfo');
            return;
        }

        // We got the object - return it in JSON format.
        console.log('SchemaInfo', info[0]);
        response.end(JSON.stringify(info[0]));
    });
});

/*
 * URL /user/list - Return names of all the users.
 */
app.get('/user/list', function (request, response) {
    if (request.session.login_name === undefined) {
        response.status(401).send('You must login to continue.');
        return;
    }
    console.log(request.session.user._id)
    User.find({_id: {$ne: request.session.user._id}}).select("_id first_name last_name").exec(function(err, users){
        if (err) {
            response.status(500).send(JSON.stringify(err));
        } else {
            console.log(JSON.stringify(users));
            response.status(200).end(JSON.stringify(users));
        }
    });
});

/*
 * URL /user/:id - Return the information for User (id)
 */
app.get('/user/:id', function (request, response) {
    if (request.session.login_name === undefined) {
        response.status(401).send('You must login to continue.');
        return;
    }
    var id = request.params.id;
    User.findOne({_id: id})
        .select("_id first_name last_name location description occupation mentions login_name")
        .exec( function(err, user) {
        if (err) {
            response.status(400).send(JSON.stringify(err));
        } else if (user === null) {
            console.log('User with _id:' + id + ' not found.');
            response.status(400).send('Not found');
            return;
        } else {
            var userCopy = JSON.parse(JSON.stringify(user));
            delete userCopy.__v;
            response.status(200).end(JSON.stringify(userCopy));
        }
    });
});

/*
 * URL /conversation/:id - Return the logged in user's conversation with id (most recent 100 messages)
 */
app.get('/conversation/:id', function (request, response) {
    if (request.session.login_name === undefined) {
        response.status(401).send('You must login to continue.');
        return;
    }
    var id = request.params.id;
    var user = request.session.user._id;
    var cipher = messenger.newRSA(request.session.rsa_gen);
    var insecureFromLoggedIn = {$and: [{'sender': user},  {'recipient': id}, {'encrypted': false}]};
    var insecureToLoggedIn = {$and: [{'sender': id},  {'recipient': user}, {'encrypted': false}]};
    var anyInsecure =  {$or: [insecureFromLoggedIn, insecureToLoggedIn]};
    var secureToLoggedInUser = {$and: [{'sender': id},  {'recipient': user}, {'senderCopy': false}, {'encrypted': true}]};
    var secureFromLoggedInUser = {$and: [{'sender': user},  {'recipient': id},  {'senderCopy': true}, {'encrypted': true}]};
    Message.find({$or: [anyInsecure, secureToLoggedInUser,  secureFromLoggedInUser]}, function(err, messages) { //({$or:[ {$and: [{'sender': id}, {'recipient': user}]}, {$and: [{'sender': user}, {'recipient': id}]}]}
        if (err) {
            response.status(400).send(JSON.stringify(err));
        } else if (user === null) {
            console.log('Conversation with _id:' + id + ' not found.');
            response.status(400).send('Not found');
            return;
        } else {
            var messagesObj = JSON.parse(JSON.stringify(messages));
            messagesObj.map(function(message){ delete message.__v;});
            delete messagesObj.__v;
            messagesObj.map(function(message) {
                if(message.encrypted) {
                    message.content = cipher.decrypt(message.content);
                }
            });
            console.log(messages);
            response.status(200).send(JSON.stringify(messagesObj));
        }
    }).limit(100).sort({date_time: 1});
});
/*
 * URL /admin/login - Attempts to login user, returning 400 response
 * if user does not exist or if the correct password is not provided.
 */
app.post('/admin/login', function (request, response) {
    User.findOne({login_name: request.body.login_name}, function(err, user) {
        if (err) {
            response.status(400).send(JSON.stringify(err));
        } else if (user === null) {
            console.log('User with login_name' + request.body.login_name + ' not found.');
            response.status(400).send('User not found');
            return;
        } else if (!messengerPassword.doesPasswordMatch(user.password_digest, user.salt, request.body.password)){
            console.log(user.password_digest, user.salt, request.body.password);
            response.status(400).send('Incorrect password for given user.');
            return;
        } else {
            var userCopy = JSON.parse(JSON.stringify(user));
            request.session.rsa_gen = request.body.password + userCopy.salt;
            console.log(request.session.rsa_gen);
            delete userCopy.password_digest;
            delete userCopy.salt;
            request.session.user = userCopy;
            request.session.login_name = user.login_name;
            response.status(200).send(userCopy);
        }
    });

});

/*
 * URL /admin/logout - Destroys the user session, 400 response if session
 * does not exist.
 */
app.post('/admin/logout', function (request, response) {
    if (request.session.login_name === undefined) {
        response.status(400).send('No user is currently logged in.');
        return;
    } else {
        request.session.destroy(function (err) { } );
        response.status(200).send('User logged out!');
        return;
    }
});


/*
 * URL /user/ - Allows a new user to register. 
 * The registration POST takes a JSON-encoded body with the following properties: 
 * (login_name, password, first_name, last_name).
 * login_name, first_name, and last_name must be defined as non-empty strings. 
 * If the information is valid, then a new user is created in the database. 
 * If there is an error, the response returns status 400 and a string indicating the error.
 */
app.post('/user', function (request, response) {
    if(!request.body.login_name || !request.body.first_name || !request.body.last_name){
        response.status(400).send('Login name, first name, and last name are required to register.');
        return;
    } else if('' === request.body.login_name || '' === request.body.first_name || '' === request.body.last_name){
        response.status(400).send('Login name, first name, and last name cannot be empty.');
        return;
    } else if(request.body.password === '' || !request.body.password){
        response.status(400).send('Password is required to register.');
        return;
    }
    User.findOne({login_name: request.body.login_name}).exec(function(err, user){
        if (err) {
            response.status(500).send('Internal server error');
            return;
        } else if(user !== null){
            response.status(400).send('Failed login: User already exists.');
            return;
        } else {
            var newUser = 
                {
                    first_name: request.body.first_name,
                    last_name: request.body.last_name,
                    login_name: request.body.login_name,
                };
            var passwordFields = messengerPassword.makePasswordEntry(request.body.password);
            newUser.password_digest = passwordFields.hash;
            newUser.salt = passwordFields.salt;
            newUser.pub_key = messenger.newRSA(request.body.password + newUser.salt).rsaPublicKey;

            User.create(newUser, function (err, user) {
                if (err) {
                    response.status(400).send('User could not be added to database.');
                    return;
                } else {
                    response.status(200).send(user);
                    return;
                }
            });
        }
    });
});

/*
 * URL /message/:userId
 * Allows the logged in user to send a message to the user with id of userId parameter.
 * If there is an error (not logged in, invalid user, failed encrypt, or empty message),
 * the response returns status 400 and a string indicating the error.
 */
app.post('/message/:userId', function (request, response) {
    if (request.session.login_name === undefined || request.session.rsa_gen === undefined) {
        response.status(401).send('You must login to continue.');
        return;
    }
    var id = request.params.userId;
    if('' === request.body.msg || request.body.msg === null){
        response.status(400).send('Message cannot be empty.');
        return;
    }
    var senderPubKey = request.session.user.pub_key;

    User.findOne({_id: id}).exec(function(err, user){
        if (err) {
            response.status(500).send('Internal server error');
            return;
        } else if(user === null){
            response.status(400).send('User does not exist.');
            return;
        } else {
            var raw = request.body.msg;
            var senderCiphertext = raw;
            var recipientCiphertext = raw;
            if(request.body.encrypted){
                recipientCiphertext = messenger.sendEncrypt(raw, user.pub_key);
                senderCiphertext = messenger.sendEncrypt(raw, senderPubKey);
            }
            console.log(senderCiphertext);
            console.log(recipientCiphertext);
            var recipientCopy = 
                {
                    sender: request.session.user._id,
                    recipient: id,
                    content: recipientCiphertext,
                    encrypted: request.body.encrypted,
                    senderCopy: false,
                };
            var senderCopy = 
                {
                    sender: request.session.user._id,
                    recipient: id,
                    content: senderCiphertext,
                    encrypted: request.body.encrypted,
                };
            Message.create(recipientCopy, function (err, msg) {
                if (err) {
                    response.status(400).send('Recipient message could not be added to database.');
                    return;
                } else {
                    console.log('Added msg', msg);
                    if(request.body.encrypted){
                    Message.create(senderCopy, function (err, msg2) {
                        if (err) {
                            response.status(400).send('Recipient message could not be added to database.');
                            return;
                        } else {
                            console.log('Added msg', msg2);
                            
                            response.status(200).send(msg2);
                        }
                    });
                    return;
                    } else  {
                        response.status(200).send(msg);
                        return;
                    }
                }
            });
        }
    });
});




var server = app.listen(3000, function () {
    var port = server.address().port;
    console.log('Listening at http://localhost:' + port + ' exporting the directory ' + __dirname);
});