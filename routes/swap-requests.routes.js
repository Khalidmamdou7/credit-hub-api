const swapRequestsRouter = require('express').Router();
const swapRequestsService = require('../services/swap-requests.services');

const passport = require('passport');

/**
 * @swagger
 * components:
 *  securitySchemes:
 *      BearerAuth:
 *          type: http
 *          scheme: bearer
 *          bearerFormat: JWT
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
 *              - offeredTimeslot
 *          properties:
 *              wantedTimeslots:
 *                  type: array
 *                  items:
 *                      type: string
 *                      description: The ids of the timeslots the user wants to swap
 *              offeredTimeslot:
 *                  type: string
 *                  description: The id of the timeslot that the user is offering to swap
 *          example:
 *              wantedTimeslots: ["12dasd1312-1dasd2131", "dsdsa-sadffds-sfdads-dsfsds"]
 *              offeredTimeslot: "23878329das0-23878329das0"
 *      SwapRequestResponse:
 *          type: object
 *          required:
 *              - id
 *              - wantedTimeslots
 *              - offeredTimeslot
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
 *              offeredTimeslot:
 *                  type:
 *                      $ref: '#/components/schemas/SwapRequestTimeslot'
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
 *              offeredTimeslot:
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
 *      security:
 *          - BearerAuth: []
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
 *      security:
 *          - BearerAuth: []
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      $ref: '#/components/schemas/SwapRequestRequest'
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
 *      security:
 *          - BearerAuth: []
 *      parameters:
 *          - in: path
 *            name: id
 *            schema:
 *              type: string
 *              required: true
 *              description: The swap request id
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      $ref: '#/components/schemas/SwapRequestRequest'
 *      responses:
 *          200:
 *              description: Success
 *              content:
 *                  application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/SwapRequestRequest'
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
 *      security:
 *          - BearerAuth: []
 *      parameters:
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

/**
 * @swagger
 * /api/swap-requests/{id}/agree:
 *  post:
 *      description: Agree to a swap request
 *      tags:
 *          - Swap Requests
 *      security:
 *          - BearerAuth: []
 *      parameters:
 *          - in: path
 *            name: id
 *            schema:
 *              type: string
 *              required: true
 *              description: The user swap request id
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          matchedSwapRequestId:
 *                              type: string
 *                              description: The matched swap request id
 *                      example:
 *                          matchedSwapRequestId: "4123sd32-4128bhf-312vf23-89jsd23"
 *      responses:
 *          200:
 *              description: Success
 *              content:
 *                  application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/SwapRequestResponse'
 *          400:
 *              description: Bad request
 *          401:
 *              description: Unauthorized (token not valid)
 *          404:
 *              description: Not found
 *          500:
 *              description: Internal server error
 */

swapRequestsRouter.post('/:id/agree/', passport.authenticate('jwt', {session: false}), async (req, res, next) => {
    const mySwapRequestId = req.params.id;
    const {matchedSwapRequestId} = req.body;
    try {
        const swapRequest = await swapRequestsService.agreeSwapRequest(req.user, mySwapRequestId, matchedSwapRequestId);
        res.json(swapRequest);
    } catch (err) {
        next(err);
    }
});

/**
 * @swagger
 * /api/swap-requests/{id}/disagree:
 *  post:
 *      description: Disagree to a swap request
 *      tags:
 *          - Swap Requests
 *      security:
 *          - BearerAuth: []
 *      parameters:
 *          - in: path
 *            name: id
 *            schema:
 *              type: string
 *              required: true
 *              description: The user swap request id
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          rejectedSwapRequestId:
 *                              type: string
 *                              description: The rejected swap request id
 *                      example:
 *                          rejectedSwapRequestId: "4123sd32-4128bhf-312vf23-89jsd23"
 *      responses:
 *          200:
 *              description: Success
 *          401:
 *              description: Unauthorized (token not valid)
 *          404:
 *              description: Not found
 *          500:
 *              description: Internal server error
 */

swapRequestsRouter.post('/:id/disagree/', passport.authenticate('jwt', {session: false}), async (req, res, next) => {
    const mySwapRequestId = req.params.id;
    const {rejectedSwapRequestId} = req.body;
    try {
        const swapRequest = await swapRequestsService.disagreeToSwapRequest(req.user, mySwapRequestId, rejectedSwapRequestId);
        res.json(swapRequest);
    } catch (err) {
        next(err);
    }
});

/**
 * @swagger
 * /api/swap-requests/courses/{courseCode}:
 *  get:
 *      description: Get all swap requests for a course
 *      tags:
 *          - Swap Requests
 *      parameters:
 *          - in: path
 *            name: courseCode
 *            schema:
 *              type: string
 *              required: true
 *              description: The course code
 *      responses:
 *          200:
 *              description: Success
 *              content:
 *                  application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/SwapRequestResponse'
 *          500:
 *              description: Internal server error
 *          404:
 *              description: Not found
 *          422:
 *              description: Unprocessable entity
 */

swapRequestsRouter.get('/courses/:courseCode', async (req, res, next) => {
    try {
        const swapRequests = await swapRequestsService.getSwapRequestsByCourse(req.params.courseCode);
        res.json(swapRequests);
    } catch (err) {
        next(err);
    }
});

module.exports = swapRequestsRouter;