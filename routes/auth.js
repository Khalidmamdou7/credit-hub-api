const express = require('express');
const authRouter = express.Router();

const authService = require('../services/auth');

authRouter.post('/login', async (req, res, next) => {
    try {
        const {email, password} = req.body;
        const output = await authService.login(email, password);
        res.json(output);
    } catch (e) {
        res.status(400).json({error: e.message});
        console.log(e);
        throw e;
    }
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