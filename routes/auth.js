const express = require('express');
const authRouter = express.Router();
const passport = require('passport');

const authService = require('../services/auth');

/**
 * @swagger
 * components:
 *  schemas:
 *      UserResponse:
 *          type: object
 *          required:
 *              - email
 *              - name
 *              - userId
 *              - token
 *          properties:
 *              email:
 *                  type: string
 *                  description: The user's email
 *              name:
 *                  type: string
 *                  description: The user's name
 *              userId:
 *                  type: string
 *                  description: The user's id
 *              token:
 *                  type: string
 *                  description: The user's token
 *          example:
 *              email: "khalidmamdou7@gmail.com"
 *              name: "Khalid Mamdouh"
 *              userId: "f7b4c2c0-5c6a-11eb-9e8b-0b3d2b0c4e9a"
 *              token: "e3sjoidfnsfsdaklSADFsd.fwioqnDSFAsfdaklmsfda.adfsDSFAfsadfasdfojknsdfam.fnqiweonqwe23412fmslkdaSAF"
 *      UserRegisterRequest:
 *          type: object
 *          required:
 *              - email
 *              - name
 *              - password
 *          properties:
 *              email:
 *                  type: string
 *                  description: The user's email
 *              name:
 *                  type: string
 *                  description: The user's name
 *              password:
 *                  type: string
 *                  description: The user's password
 *          example:
 *              email: "khalidmamdou7@gmail.com"
 *              name: "Khalid Mamdouh"
 *              password: "12345678"
 */

/**
 * @swagger
 * /api/auth/login:
 *  post:
 *      description: Login a user
 *      tags:
 *          - auth
 *      parameters:
 *          - in: body
 *            name: user
 *            description: The user to login 
 *            schema:
 *              type: object
 *              required:
 *                  - email
 *                  - password
 *              properties:
 *                  email:
 *                      type: string
 *                  password:
 *                      type: string
 *      responses:
 *          200:
 *              description: The user was logged in successfully
 *              content:
 *                  application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/UserResponse'
 *          422:
 *              description: Bad request (invalid email or password)
 *          401:
 *              description: Unauthorized
 *          404:
 *              description: User not found
 *          500:
 *              description: Internal server error
 */

authRouter.post('/login', passport.authenticate('local', {session: false}), async (req, res, next) => {
    res.json(req.user);
});

/**
 * @swagger
 * /api/auth/register:
 *  post:
 *      description: Register a user
 *      tags:
 *          - auth
 *      parameters:
 *          - in: body
 *            name: user
 *            description: The user to register
 *            schema:
 *              $ref: '#/components/schemas/UserRegisterRequest'
 *      responses:
 *          200:
 *              description: The user was registered successfully
 *              content:
 *                  application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/UserResponse'
 *          422:
 *              description: Unprocessable entity (validation error)
 *          500:
 *              description: Internal server error
 */

authRouter.post('/register', async (req, res, next) => {
    try {
        const {email, password, name} = req.body;
        const output = await authService.register(email, password, name);
        res.json(output);
    } catch (e) {
        next(e);
    }
});

module.exports = authRouter;