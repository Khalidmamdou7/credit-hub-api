const contactRouter = require('express').Router();
const axios = require('axios');



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
        // send a get request to this link:
        // https://api.callmebot.com/whatsapp.php?phone=201272404140&text=This+is+a+test&apikey=5369429

        const apiLink = `https://api.callmebot.com/whatsapp.php?phone=${phoneNumber}&text=${text}&apikey=${apiKey}`;
        const response = await axios.get(apiLink);
        if (response.status !== 200) {
            console.log(response);
            throw new Error('Error sending request to admin, Either the phone number is invalid or the api key is invalid');
        }
        res.json({
            message: 'Request sent to admin'
        });
    } catch (error) {
        next(error)
    }
});


module.exports = contactRouter;