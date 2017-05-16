"use strict";

var mongoose = require('mongoose');

var messageSchema = new mongoose.Schema({
    encrypted: Boolean,
    senderCopy: {type: Boolean, default: true}, //Is message encrypted with user's public key??
    sender: String,
    recipient: String, 
    content: String,
    date_time: {type: Date, default: Date.now} //Time the message was sent
});

var Message = mongoose.model('Message', messageSchema);

module.exports = Message;
