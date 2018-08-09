var mongoose = require('mongoose');
var router = require('express').Router();
var passport = require('passport');
var User = mongoose.model('User');
var auth = require('../auth');
var aws = require('aws-sdk');
var multer = require('multer');
var upload = multer()
var s3Helper = require('../s3');
var emailer = require('../emailer');
var config = require('../../config')
const { secret, domain } = config;
var crypto = require('crypto');

router.get('/user', auth.required, async (req, res, next) => {
  try {
    const user = await User.findById(req.payload.id);
    if (!user) {
      return res.sendStatus(401);
    }
    return res.json({user: user.toAuthJSON()});
  } catch (e) {
    next(e)
  }
});

router.get('/users/:id', auth.required, async (req, res, next) => {
  try {
    const requestUser = await User.findById(req.payload.id);
    if (!requestUser) {
      return res.sendStatus(401);
    }

    if (requestUser.isAdmin) {
      const userId = req.params.id;
      const user = await User.findById(userId);
      return res.json({user: user.toAuthJSON()});
    } else {
      return res.status(403).json({errors: {authorization: "Not authorized."}});
    }
  } catch (e) {
    next(e)
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find().sort({ canonicalFirstName: 1 });
    res.json({
        users: users.map((user) => user.toAuthJSON(user))
    });  
  } catch (e) {
    next(e)
  }
});

router.put('/user', [auth.required, upload.fields([{name:'data'}, {name:'file'}])], async (req, res, next) => {  
  let user = await User.findById(req.payload.id);
  if(!user){ return res.sendStatus(401); }
  const data = JSON.parse(req.body.data);
  const userFromRequest = data.user;
  const deleteImage = data.deleteImage;
  const files = req.files;
  let imageFromRequest;

  if (user.isAdmin) {
    user = await User.findById(userFromRequest.id);

    if(typeof userFromRequest.isAdmin !== 'undefined'){
      user.isAdmin = userFromRequest.isAdmin;
    }

    if(typeof userFromRequest.isActiveMember !== 'undefined'){
      user.isActiveMember = userFromRequest.isActiveMember;
    }
  }

  if (files.file) {
    imageFromRequest = files.file[0]
  }    
  
  // only update fields that were actually passed...

  if(typeof userFromRequest.firstName !== 'undefined'){
    user.firstName = userFromRequest.firstName;
    user.canonicalFirstName = userFromRequest.firstName.toLowerCase();
  }

  if(typeof userFromRequest.lastName !== 'undefined'){
    user.lastName = userFromRequest.lastName;
    user.canonicalLastName = userFromRequest.lastName.toLowerCase();
  }

  if(typeof userFromRequest.classYear !== 'undefined'){
    user.classYear = userFromRequest.classYear;
  }

  if(typeof userFromRequest.title !== 'undefined'){
    user.title = userFromRequest.title;
  }

  if(typeof userFromRequest.linkedIn !== 'undefined'){
    user.linkedIn = userFromRequest.linkedIn;
  }

  if (imageFromRequest) {
    try {
      const uploadedImage = await s3Helper.uploadImageToS3(imageFromRequest.buffer, imageFromRequest.originalname);
      user.image = uploadedImage.Location;
    } catch (e) {
      next(e)
    }
  } else {
    if (deleteImage) {
      user.image = undefined;
    }
  }

  if(typeof userFromRequest.password !== 'undefined'){
    if (userFromRequest.password.length < 5 ) {
      return res.status(422).json({errors: {password: "Password must be 5 characters or greater."}});
    } else {
      user.setPassword(userFromRequest.password);
    }
  }

  try {
    const savedUser = await user.save()
    return res.json({user: user.toAuthJSON()})
  } catch(e) {
    console.log("ERRROR ON SAVE")
    console.log(e);
    next(e)
  }
});

router.post('/users/login', function(req, res, next){
  if(!req.body.user.email){
    return res.status(422).json({errors: {email: "Email can't be blank"}});
  }

  if(!req.body.user.password){
    return res.status(422).json({errors: {password: "Password can't be blank"}});
  }  

  passport.authenticate('local', {session: false}, function(e, user, info) {  
    if (e) {
      return res.status(422).json({errors: {default: "There was an error authenticating."}});
    }

    if (user){
      user.token = user.generateJWT(60);
      return res.json({user: user.toAuthJSON()});
    } else {
      return res.status(422).json({errors: {login: "Your email and/or your password are invalid."}});
    }
  })(req, res, next);
});

router.post('/verify', async (req, res, next) => {
  try {
    const passwordHash = req.body.hash;
    const { id } = User.verify(passwordHash, secret);
    const foundUser = await User.findById(id);
    if (foundUser.confirmedEmail) {
      return res.status(422).json({errors: {verify: "This email has already been confirmed!"}});
    }
    foundUser.confirmedEmail = true;
    await foundUser.save();
    res.sendStatus(200);
  } catch(e) {
    return res.status(422).json({errors: {verify: "We couldn't verify your email address. Please try again on the account page."}});
  }
});


router.post('/sendEmailVerification', auth.required, async (req, res, next) => {
  User.findById(req.payload.id).then(async(user) => {
    user.sendEmailVerification();
    try {
      await user.save();
      res.sendStatus(200);
    } catch(e) {
      return res.status(422).json({errors: {verify: "We couldn't verify your email address. Please try again on the account page."}});
    }
  })
});

router.post('/users', async (req, res, next) => {
  try {
    let user = new User();
    const userFromRequest = req.body.user;    
  
    user.email = userFromRequest.email;
  
    user.classYear = userFromRequest.classYear;
  
    if (!userFromRequest.password) {
      return res.status(422).json({errors: {password: "A password is required."}});
    } else if (userFromRequest.password && userFromRequest.password.length < 5 ) {
      return res.status(422).json({errors: {password: "Password must be 5 characters or greater."}});
    } else {
      user.setPassword(userFromRequest.password);
    }
  
    user.firstName = userFromRequest.firstName;
    user.canonicalFirstName = userFromRequest.firstName.toLowerCase();
    user.lastName = userFromRequest.lastName;
    user.canonicalLastName = userFromRequest.lastName.toLowerCase();
  
    const userToReturn = await user.save();

    await user.sendEmailVerification();

    return res.json({user: userToReturn.toAuthJSON()});
  
  } catch (e) {
    console.error("SOMETHING WENT WRONG REGISTERING A USER");
    console.error(e);
    next(e);
  }

});

router.post('/changePassword', async (req, res, next) => {
  const passwordHash = req.body.hash;
  if (!passwordHash) {
    return res.status(422).json({errors: {default: "You did not pass up a hash."}});
  } else {    
    try {
      // look up user in the DB based on reset hash
      const query = User.findOne({ passwordReset: req.body.hash, passwordResetExpirationDate: { $gt: Date.now() }});  
      const foundUser = await query.exec();      

      // If the user exists save their new password
      if (foundUser) {
        if (req.body.password && req.body.password.length < 5) {
          return res.status(422).json({errors: {password: "Password must be 5 characters or greater."}});
        } else {
          foundUser.setPassword(req.body.password);
          foundUser.passwordReset = undefined;
          foundUser.passwordResetExpirationDate = undefined;  
        }
        
        try {
          await foundUser.save();
          res.sendStatus(200);
        } catch(e) {
          next(e)
        }
      } else {
        return res.status(422).json({errors: {default: "There is something wrong with the reset password link. Either you have used this link before or it has expired. Please request a new password reset."}});
      }
    } catch (err) {
      return res.status(422).json({errors: {default: "There is something wrong with the reset password link. Either you have used this link before or it has expired. Please request a new password reset."}});
    }
    return result;
  }
});

router.post('/resetPassword', async (req, res, next) => {
  try {
    // check and make sure the email exists
    const query = User.findOne({ email: req.body.email });
    const foundUser = await query.exec();

    // For security, we always send back a 200
    if (!foundUser) {
      return res.sendStatus(200);
    }

    // If the user exists, save their password hash
    const timeInMs = Date.now();    
    const hashString = `${req.body.email}${timeInMs}`;
    const hash = crypto.createHmac('sha256', secret)
                       .update(hashString)
                       .digest('hex');
    
    foundUser.passwordReset = hash;
    foundUser.passwordResetExpirationDate = timeInMs + 3600000; // 1 hour
    await foundUser.save();     
    await emailer.sendEmail({ 
          to: foundUser.email,
          subject: 'Reset Your Password',
          html: `A password reset has been requested for the Coding Lawyers Club account connected to this email address. If you made this request, please click the following link: <a href="${domain}/changePassword/${foundUser.passwordReset}">${domain}/changePassword/${foundUser.passwordReset}</a>.</p><p>If you didn't make this request, feel free to ignore it! Note: this password reset link expires in one hour.`,
        })
    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    return res.status(422).json({errors: {reset: "Something went wrong when attempting to reset your password."}});
  }
});



module.exports = router;
