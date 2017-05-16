"use strict";


var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create a schema
var schemaInfo = new Schema({
    version: String,
    load_date_time: {type: Date, default: Date.now},
});

var SchemaInfo = mongoose.model('SchemaInfo', schemaInfo);

module.exports = SchemaInfo;
