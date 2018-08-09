var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');
var crypto = require('crypto');
var jwt = require('jsonwebtoken');

var emailer = require('../routes/emailer');
var config = require('../config')
const { secret, domain } = config;

var UserSchema = new mongoose.Schema({
  canonicalFirstName: String,
  canonicalLastName: String,
  confirmedEmail: {type: Boolean, required:true, default: false},
  email: {type: String, lowercase: true, unique: true, required: [true, "Email can't be blank"], match: [/\S+@\S+\.\S+/, 'Email is invalid'], index: true},
  firstName: {type: String, required:[true, "First name is required"], minlength:[2, "First name must be longer than 2 characters"], maxlength:[20, "First name must 20 characters or shorter"]},
  hash: {type: String, required:[true, "A hash  is required"]},
  lastName: {type: String, required:[true, "Last name is required"], minlength:[2, "Last name must be longer than 2 characters"], maxlength:[20, "Last name must 20 characters or shorter"]},
  image: String,
  passwordReset: {type: String, select: false},
  passwordResetExpirationDate: {type: Date, select: false},
  salt: {type: String, required:[true, "A salt  is required"]},
  title: {type: String, maxlength:[20, "Title must 20 characters or shorter"]},
}, {timestamps: true});

UserSchema.plugin(uniqueValidator, {message: 'That email is already associated with an account.'});

UserSchema.methods.validPassword = function(password) {
  var hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
  return this.hash === hash;
};

UserSchema.methods.setPassword = function(password){
  this.salt = crypto.randomBytes(16).toString('hex');
  this.hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
};

UserSchema.methods.generateJWT = function(daysUntilExpiration) {
  var today = new Date();
  var exp = new Date(today);
  exp.setDate(today.getDate() + daysUntilExpiration);

  return jwt.sign({
    id: this._id,
    exp: parseInt(exp.getTime() / 1000),
  }, secret);
};

UserSchema.methods.sendEmailVerification = function(){
    // Let the token expire in 7 days
    const emailToken = this.generateJWT(7);

    const emailUrl = `${domain}/verify/${emailToken}`
  
    return emailer.sendEmail({ 
      to: this.email,
      subject: 'Confirm your email',
      html: `Please click this link to confirm your email address for the ToDo App: <a href=${emailUrl}>${emailUrl}</a>`,
    })
}

UserSchema.methods.toAuthJSON = function(){
  return {
    id: this.id,
    email: this.email,
    token: this.generateJWT(60),
    image: this.image,
    firstName: this.firstName,
    lastName: this.lastName,
    linkedIn: this.linkedIn,
    classYear: this.classYear,
    title: this.title,
    confirmedEmail: this.confirmedEmail,
    isActiveMember: this.isActiveMember,
    isAdmin: this.isAdmin,
    createdAt: this.createdAt
  };
};

UserSchema.methods.toMemberJSONFor = function(){
  return {
    firstName: this.firstName,
    lastName: this.lastName,
    linkedIn: this.linkedIn,
    image: this.image,
    classYear: this.classYear,
    title: this.title
  };
};

// Statics
UserSchema.statics.verify = function(hash, secret) {  
  return jwt.verify(hash, secret);
};


UserSchema.index({canonicalFirstName: 1});

mongoose.model('User', UserSchema);
