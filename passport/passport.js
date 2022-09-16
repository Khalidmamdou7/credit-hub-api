import passport from 'passport'
import { Strategy as AnonymousStrategy } from 'passport-anonymous'
import { Strategy as LocalStrategy} from 'passport-local'
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt'
import authService from '../services/auth.js'



const Neo4jStrategy = new LocalStrategy({
    usernameField: 'email',  // Use email address as username field
    session: false,          // Session support is not necessary
    passReqToCallback: true, // Passing the request to the callback allows us to use the open transaction
  }, async (req, email, password, done) => {
   
    const user = await authService.login(email, password)
  
    done(null, user)
  })

const jwtStrategy = new JwtStrategy({
  secretOrKey: process.env.JWT_SECRET,    // Secret for encoding/decoding the JWT token
  ignoreExpiration: true,     // Ignoring the expiration date of a token may not be the best idea in a production environment
  passReqToCallback: true,    // Passing the request to the callback allows us to use the open transaction
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
}, async (req, claims, done) => {

  return done(null, await authService.claimsToUser(claims))
})



passport.use(Neo4jStrategy)
passport.use(jwtStrategy)
passport.use(new AnonymousStrategy())

passport.serializeUser((user, done) => {
  done(null, user)
})

passport.deserializeUser((id, done) => {
  done(null, user)
})
