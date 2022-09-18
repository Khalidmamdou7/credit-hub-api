const express = require('express');
const authRouter = express.Router();
const passport = require('passport');

const authService = require('../services/auth');

authRouter.post('/login', passport.authenticate('local', {session: false}), async (req, res, next) => {
    res.json(req.user);
});

authRouter.post('/register', async (req, res, next) => {
    try {
        const {email, password, name} = req.body;
        const output = await authService.register(email, password, name);
        res.json(output);
    } catch (e) {
        res.status(400).json({message: e.message});
        console.log(e);
    }
});

module.exports = authRouter;