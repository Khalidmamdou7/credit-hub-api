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

// send confirmation email with nice css styling and a button to confirm and a description of the website and a link to copy the confirmation link
// and a button to copy the confirmation link to the clipboard and a button if the user hasn't registered on the website to report this as a bug
const sendConfirmationEmail = async (email, userId, token) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: 'Confirm your email',
            html: `
            <div style="background-color: #f2f2f2; padding: 20px; border-radius: 10px; width: 500px; margin: 0 auto;">
                <h1 style="text-align: center; color: #4d4d4d;">Confirm your email</h1>
                <p style="text-align: center; color: #4d4d4d;">Please click the button below to confirm your email.</p>
                <a href="http://localhost:3000/confirm/${userId}/${token}" style="text-decoration: none; display: block; margin: 0 auto; width: 200px; background-color: #4d4d4d; color: #f2f2f2; padding: 10px; border-radius: 10px; text-align: center;">Confirm</a>
                <p style="text-align: center; color: #4d4d4d;">If you can't click on the button, please copy the following link to your browser</p>
                <p style="text-align: center; color: #4d4d4d;">http://${process.env.DOMAIN}/api/auth/confirm/${userId}/${token}</p>
                <br>
                <p style="text-align: center; color: #4d4d4d;">Thank you for using our website</p>
                <p style="text-align: center; color: #4d4d4d;">The <a href="http://${process.env.DOMAIN}" style="text-decoration: none; color: #4d4d4d;">Swap Courses</a> team</p>
                <hr style="border: 0.5px solid #4d4d4d; width: 100%; margin: 20px 0;">
                <p style="text-align: center; color: #4d4d4d;">If you didn't sign up for an account, you can safely delete this email</p>
            </div>
            `
        };
        await transporter.sendMail(mailOptions);
        console.log('Email sent');
    } catch (error) {
        console.log("Error sending email: ", error);
    }

};

module.exports = {
    sendEmail,
    sendConfirmationEmail
};