const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const AnonymousStrategy = require('passport-anonymous').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const authService = require('../services/auth');
const dotenv = require('dotenv');
dotenv.config();



const Neo4jStrategy = new LocalStrategy({
    usernameField: 'email',  // Use email address as username field
    session: false,          // Session support is not necessary
    passReqToCallback: true, // Passing the request to the callback allows us to use the open transaction
  }, async (req, email, password, done) => {
    try {
      const user = await authService.auth(email, password)
      done(null, user);
    } catch (err) {
      return done(err);
    }
  })

const jwtStrategy = new JwtStrategy({
  secretOrKey: process.env.JWT_SECRET,    // Secret for encoding/decoding the JWT token
  ignoreExpiration: false,     // Ignoring the expiration date of a token may not be the best idea in a production environment
  passReqToCallback: true,    // Passing the request to the callback allows us to use the open transaction
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
}, async (req, claims, done) => {
  return done(null, await authService.claimsToUser(claims))
})



passport.use('local', Neo4jStrategy)
passport.use('jwt', jwtStrategy)
passport.use('anonymous', new AnonymousStrategy())

passport.serializeUser((user, done) => {
  done(null, user)
})

passport.deserializeUser((id, done) => {
  done(null, user)
})

module.exports = passport
