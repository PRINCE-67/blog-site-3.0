//jshint esversion:6
require("dotenv").config();
const bodyParser=require("body-parser");
const ejs=require("ejs");
const express=require("express");
const mongoose =require("mongoose");
const session=require("express-session");
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const aboutContent = "This is a Blog site, where you can create a single Blog and keep your blog to yourself, no one can see your blog."
const contactContent = " Prince Verma aka Owner | princeverma694269@gmail.com | +91 8625844658"

const app=express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/blog-v3-DB", {useNewUrlParser: true});

const userSchema=new mongoose.Schema({
  email:String,
  password:String,
  title:String,
  content:String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User=new mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:4000/auth/google/userblog",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/",function(req,res){
  res.render("home");
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/userblog",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to home.
    res.redirect("/post");
  });

app.get("/login", function(req, res){
  res.render("login");
});

app.post("/login", function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/post");
      });
    }
  });
});


app.get("/register", function(req, res){
  res.render("register");
});

app.post("/register", function(req, res){

  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      // code is an example of a route that authenticates a user with a username and password
      passport.authenticate("local")(req, res, function(){
        res.redirect("/post");
      });
    }
  });
});

app.get("/post", function(req, res){

  User.findById(req.user.id, function(err,foundUser){
    if(err)
    console.log(err);
    else{
      res.render("post", {
        startingContent: homeStartingContent,
        post: foundUser
        });
    }
  });
});

app.get("/compose", function(req, res){
  if (req.isAuthenticated()){
    res.render("compose");
  } else {
    res.redirect("/login");
  }
});

app.post("/compose", function(req, res){
    const title= req.body.postTitle;
    const content=req.body.postBody;

    User.findById(req.user.id,function(err,foundUser){
      if(err)
      console.log(err);
      else{
        if(foundUser){
          foundUser.title=title;
          foundUser.content=content;
          foundUser.save(function(){
            res.redirect("post");
          });
        }
      }
  });
});


app.get("/about", function(req, res){
  res.render("about", {aboutContent: aboutContent});
});

app.get("/contact", function(req, res){
  res.render("contact", {contactContent: contactContent});
});

app.get("/logout", function(req, res){
  req.session.destroy(function (err) {
    res.redirect('/'); //Inside a callback… bulletproof!
  });
});

app.listen(4000,function(){
  console.log("server started on port:4000");
});
