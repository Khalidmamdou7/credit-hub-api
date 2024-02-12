const contactRouter = require('express').Router();
const axios = require('axios');
const { log } = require('winston');
const logger = require('../configs/logger');

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const { sendEmail } = require('../utils/mail');



/**
 * @swagger
 * /api/contact/volunteer:
 *  post:
 *      summary: Send a volunteer request
 *      tags:
 *          - Contact
 *      requestBody:
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          phoneNumber:
 *                              type: string
 *                              description: The phone number of the admin
 *                          text:
 *                              type: string
 *                              description: The text of the message
 *                          apiKey:
 *                              type: string
 *                              description: The api key of the service sending the request to the admin
 *      responses:
 *          200:
 *              description: A message indicating the request has been sent to the admin
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              message:
 *                                  type: string
 *                                  description: The message indicating the request has been sent to the admin
 * 
 */

contactRouter.post('/volunteer', async (req, res, next) => {
    try {
        const phoneNumber = req.body.phoneNumber;
        const text = req.body.text;
        const apiKey = req.body.apiKey;
        if (!phoneNumber || !text || !apiKey) {
            throw new Error('Invalid request, missing one of the required fields');
        }

        const apiLink = `https://api.callmebot.com/whatsapp.php?phone=${phoneNumber}&text=${text}&apikey=${apiKey}`;
        const response = await axios.get(apiLink);
        if (response.status !== 200) {
            logger.error(`Error sending request to admin with phone number ${phoneNumber} and api key ${apiKey}, Response from api: ${response.data}`);
            throw new Error('Error sending request to admin, Either the phone number is invalid or the api key is invalid');
        }
        logger.info(`Request sent to admin with phone number ${phoneNumber}, api key ${apiKey}, and text ${text}, Response from api: ${response.data}`);
        res.json({
            message: 'Request sent to admin'
        });
    } catch (error) {
        next(error)
    }
});

/**
 * @swagger
 * /api/contact/send-mail:
 *  post:
 *      summary: Send an email
 *      tags:
 *          - Contact
 *      requestBody:
 *          content:
 *              multipart/form-data:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          email:
 *                              type: string
 *                              description: The email of the recipient
 *                              required: true
 *                              format: email
 *                          subject:
 *                              type: string
 *                              description: The subject of the email
 *                              required: true
 *                          text:
 *                              type: string
 *                              description: The text of the email
 *                              required: true
 *                          file:
 *                              type: string
 *                              format: binary
 *                              description: The file to be attached to the email
 *                              required: false
 *      responses:
 *          200:
 *              description: A message indicating the email has been sent
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              message:
 *                                  type: string
 *                                  description: The message indicating the email has been sent
 */


contactRouter.post('/send-mail', upload.single('file'), async (req, res, next) => {
    console.log(req.body);
    try {
        const email = req.body.email;
        const subject = req.body.subject;
        const text = req.body.text;
        const file = req.file;
        if (!email || !subject || !text) {
            throw new Error('Invalid request, missing one of the required fields');
        }
        await sendEmail(email, subject, text, attachedFilePath = file ? file.path: null, attachedFileName = file ? file.originalname: null);
        res.json({
            message: 'Email sent'
        });
    } catch (error) {
        next(error)
    }
});

module.exports = contactRouter;