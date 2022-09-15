const express = require('express');
const authRouter = express.Router();

const authService = require('../services/auth');

authRouter.post('/login', async (req, res, next) => {
    try {
        const {email, password} = req.body;
        const output = await authService.login(email, password);
        res.json({email, "name": output.user.name, "token": output.token});
    } catch (e) {
        res.status(400).json({error: e.message});
    }
});

authRouter.post('/register', async (req, res, next) => {
    try {
        const {email, password, name} = req.body;
        const output = await authService.register(email, password, name);
        res.json({email, name, "token": output.token});
    } catch (e) {
        res.status(400).json({message: e.message});
    }
});

module.exports = authRouter;