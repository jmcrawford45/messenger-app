/* jshint node: true */
'use strict';

var cryptico = require("cryptico");

function cryptoObj(passPhrase)
{
   this.bits = 1024; //2048;
   this.rsaKey = cryptico.generateRSAKey(passPhrase,this.bits);
   this.rsaPublicKey = cryptico.publicKeyString(this.rsaKey);

   this.encrypt = function(message){
     var result = cryptico.encrypt(message,this.rsaPublicKey);
     return result.cipher;
   };

   this.decrypt = function(message){
     var result = cryptico.decrypt(message, this.rsaKey);
     return result.plaintext;
   };
}
module.exports = {newRSA: function(passPhrase){
	return new cryptoObj(passPhrase);
},
sendEncrypt: function(message, pubkey){
	return cryptico.encrypt(message, pubkey).cipher;
}};