const scheduleRouter = require('express').Router();
const scheduleService = require('../services/schedule.services');

// const upload = require('../server');
const multer = require('multer');   // for parsing multipart/form-data (file upload)
const upload = multer({ dest: 'uploads/' }); // configure multer to upload to 'uploads' folder


/**
 * @swagger
 * /api/schedule:
 *  post:
 *      summary: Get a schedule by code
 *      tags:
 *          - Schedule
 *      requestBody:
 *          content:
 *              multipart/form-data:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          image:
 *                              type: string
 *                              format: binary
 *                          imageUrl:
 *                              type: string
 *                              description: The url of the image itself (url ends with .jpg, .png, etc.)
 *      responses:
 *          200:
 *              description: The schedule raw text
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              scheduleRawText:
 *                                  type: string
 *                                  description: The raw text of the schedule
 *     
 * 
 * 
 */

scheduleRouter.post('/', upload.single('image'), async (req, res, next) => {
    try {
        const file = req.file;
        const imageUrl = req.body.imageUrl;
        if (!file && !imageUrl) {
            throw new Error('Invalid request');
        }
        const scheduleRawText = await scheduleService.getScheduleText(file, imageUrl);
        res.json({
            scheduleRawText
        });
    } catch (error) {
        next(error)
    }
});

module.exports = scheduleRouter;