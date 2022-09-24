const swapRequestsRouter = require('express').Router();
const swapRequestsService = require('../services/swap-requests.service');

const passport = require('passport');

/**
 * @swagger
 * components:
 *  schemas:
 *      SwapRequest:
 *          type: object
 *          required:
 *              - id
 *              - wantedTimeslots
 *              - offeredTimeslots
 *          properties:
 *              id:
 *                  type: string
 *                  description: The auto-generated id of the swap request
 *              wantedTimeslots:
 *                  type: array
 *                  items:
 *                      type: string
 *              offeredTimeslots:
 *                  type: array
 *                  items:
 *                      type: string
 *          example:
 *              id: 1
 *              wantedTimeslots: ["12dasd1312-1dasd2131", "23878329das0-23878329das0"]
 *              offeredTimeslots: ["23878329das0-23878329das0", "12dasd1312-1dasd2131"]
 */


/**
 * @swagger
 * /api/swap-requests:
 *  get:
 *      description: Get all swap requests for a logged in user (token required)
 *      parameters:
 *          - in: header
 *            name: Authorization
 *            schema:
 *              type: string
 *              required: true
 *              description: Bearer token
 *      responses:
 *          200:
 *              description: Success
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: array
 *                          items:
 *                              $ref: '#/components/schemas/SwapRequest'
 *          401:
 *              description: Unauthorized (token not valid)
 *          500:
 *              description: Internal server error
 *      tags:
 *         - Swap Requests
 */

swapRequestsRouter.get('/', passport.authenticate('jwt', {session: false}), async (req, res, next) => {
    try {
        const swapRequests = await swapRequestsService.getSwapRequests(req.user);
        res.status(200).json(swapRequests);
    } catch (err) {
        next(err);
    }
});


/**
 * @swagger
 * /api/swap-requests:
 *  post:
 *      description: Create a swap request
 *      responses:
 *          201:
 *              description: Created
 *          400:
 *              description: Bad request
 *          401:
 *              description: Unauthorized (token not valid)
 *          500:
 *              description: Internal server error
 *      tags:
 *          - Swap Requests
 *      parameters:
 *          - in: header
 *            name: Authorization
 *            schema:
 *              type: string
 *              required: true
 *              description: Bearer token
 *          - in: body
 *            schema:
 *              $ref: '#/components/schemas/SwapRequest'
 */

swapRequestsRouter.post('/', passport.authenticate('jwt', {session: false}), async (req, res, next) => {
    try {
        const swapRequest = await swapRequestsService.createSwapRequest(req.user, req.body);
        res.status(201).json(swapRequest);
    } catch (err) {
        next(err);
    }
});


/**
 * @swagger
 * /api/swap-requests/{id}:
 *  put:
 *      description: Update a swap request
 *      tags:
 *          - Swap Requests
 *      parameters:
 *          - in: header
 *            name: Authorization
 *            schema:
 *              type: string
 *              required: true
 *              description: Bearer token
 *          - in: path
 *            name: id
 *            schema:
 *              type: string
 *              required: true
 *              description: The swap request id
 *          - in: body
 *            schema:
 *              $ref: '#/components/schemas/SwapRequest'
 *      responses:
 *          200:
 *              description: Success
 *              content:
 *                  application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/SwapRequest'
 *          400:
 *              description: Bad request
 *          401:
 *              description: Unauthorized (token not valid)
 *          404:
 *              description: Not found
 *          500:
 *              description: Internal server error
 */

swapRequestsRouter.put('/:id', passport.authenticate('jwt', {session: false}), async (req, res, next) => {
    try {
        const swapRequest = await swapRequestsService.updateSwapRequest(req.user, req.params.id, req.body);
        res.status(200).json(swapRequest);
    } catch (err) {
        next(err);
    }
});


/**
 * @swagger
 * /api/swap-requests/{id}:
 *  delete:
 *      description: Delete a swap request
 *      tags:
 *          - Swap Requests
 *      parameters:
 *          - in: header
 *            name: Authorization
 *            schema:
 *              type: string
 *              required: true
 *              description: Bearer token
 *          - in: path
 *            name: id
 *            schema:
 *              type: string
 *              required: true
 *              description: The swap request id
 *      responses:
 *          200:
 *              description: Success (swap request deleted)
 *          400:
 *              description: Bad request
 *          401:
 *              description: Unauthorized (token not valid)
 *          404:
 *              description: Not found
 *          500:
 *              description: Internal server error
 */

swapRequestsRouter.delete('/:id', passport.authenticate('jwt', {session: false}), async (req, res, next) => {
    try {
        await swapRequestsService.deleteSwapRequest(req.user, req.params.id);
        res.status(200).json();
    } catch (err) {
        next(err);
    }
});


module.exports = swapRequestsRouter;