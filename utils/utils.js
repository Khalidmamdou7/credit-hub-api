const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

// nodemailer configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD
    }
});

// send email
const sendEmail = async (email, subject, text) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject,
            text
        };
        await transporter.sendMail(mailOptions);
        console.log('Email sent');
    } catch (error) {
        console.log("Error sending email: ", error);
    }
    
};

module.exports = {
    sendEmail
};