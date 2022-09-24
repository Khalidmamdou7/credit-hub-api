const swapRequestsRouter = require('express').Router();
const swapRequestsService = require('../services/swap-requests.services');

const passport = require('passport');

/**
 * @swagger
 * components:
 *  schemas:
 *      SwapRequestTimeslot:
 *          type: object
 *          properties:
 *              type:
 *                  type: string
 *                  enum: [lec, tut]
 *              group:
 *                  type: string
 *              day:
 *                  type: string
 *                  enum: [Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday]
 *              startTime:
 *                  type: string
 *                  format: time
 *              endTime:
 *                  type: string
 *                  format: time
 *              course:
 *                  type: object
 *                  properties:
 *                      code:
 *                          type: string
 *                      name:
 *                        type: string
 *      SwapRequestRequest:
 *          type: object
 *          required:
 *              - wantedTimeslots
 *              - offeredTimeslots
 *          properties:
 *              wantedTimeslots:
 *                  type: array
 *                  items:
 *                      type: string
 *              offeredTimeslots:
 *                  type: array
 *                  items:
 *                      type: string
 *          example:
 *              wantedTimeslots: ["12dasd1312-1dasd2131", "23878329das0-23878329das0"]
 *              offeredTimeslots: ["23878329das0-23878329das0", "12dasd1312-1dasd2131"]
 *      SwapRequestResponse:
 *          type: object
 *          required:
 *              - id
 *              - wantedTimeslots
 *              - offeredTimeslots
 *              - status
 *              - createdAt
 *              - updatedAt
 *          properties:
 *              id:
 *                  type: string
 *              wantedTimeslots:
 *                  type: array
 *                  items:
 *                      type:
 *                          $ref: '#/components/schemas/SwapRequestTimeslot'
 *              offeredTimeslots:
 *                  type: array
 *                  items:
 *                      type:
 *                          $ref: '#/components/schemas/SwapRequestTimeslot'
 *              status:
 *                  type: string
 *              createdAt:
 *                  type: object
 *                  properties:
 *                      $date:
 *                          type: number
 *              updatedAt:
 *                  type: object
 *                  properties:
 *                      $date:
 *                          type: number
 *          example:
 *              id: "12dasd1312-1dasd2131"
 *              wantedTimeslots:
 *                  type: "lec"
 *                  group: "1"
 *                  day: "Monday"
 *                  startTime: "9:00"
 *                  endTime: "10:00"
 *                  course:
 *                      code: "CMPN203"
 *                      name: "Software Engineering"
 *              offeredTimeslots:
 *                  type: "lec"
 *                  group: "2"
 *                  day: "Sunday"
 *                  startTime: "9:00"
 *                  endTime: "10:00"
 *                  course:
 *                      code: "CMPN203"
 *                      name: "Software Engineering"
 *              status: "pending"
 *              createdAt:
 *                  $date: 1611234567890
 *              updatedAt:
 *                  $date: 1611234567890
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
 *                              $ref: '#/components/schemas/SwapRequestResponse'
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
 *              $ref: '#/components/schemas/SwapRequestRequest'
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
 *              $ref: '#/components/schemas/SwapRequestRequest'
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
        const swapRequest = await swapRequestsService.deleteSwapRequest(req.user, req.params.id);
        res.json(swapRequest);
    } catch (err) {
        next(err);
    }
});


module.exports = swapRequestsRouter;