const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const logger = require('../configs/logger');
const { log } = require('winston');
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
const sendEmail = async (email, subject, text, attachedFilePath, attachedFileName) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject,
            text,
            attachments: attachedFilePath ? [{ path: attachedFilePath, filename: attachedFileName }] : []
        };
        await transporter.sendMail(mailOptions);
        logger.info('Email sent');
    } catch (error) {
        logger.error("Error sending email: ", error);
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
            <div style="background-color: #23272B; padding: 20px; border-radius: 10px; width: 500px; margin: 0 auto;">
                <h1 style="text-align: center; color: #FFFFFF;">Confirm your email</h1>
                <p style="text-align: center; color: #FFFFFF;">Please click the button below to confirm your email.</p>
                <a href="http://${process.env.DOMAIN}/api/auth/confirm/${userId}/${token}" style="text-decoration: none; display: block; margin: 0 auto; width: 200px; background-color: #17A2B8; color: #f2f2f2; padding: 10px; border-radius: 10px; text-align: center;">Confirm</a>
                <p style="text-align: center; color: #FFFFFF;">If you can't click on the button, please copy the following link to your browser</p>
                <p style="text-align: center; color: #17A2B8;">http://${process.env.DOMAIN}/api/auth/confirm/${userId}/${token}</p>
                <br>
                <p style="text-align: center; color: #FFFFFF;">Thank you for using our website</p>
                <p style="text-align: center; color: #FFFFFF;">The <a href="http://${process.env.CLIENT_URL}" style="text-decoration: none; color: #17A2B8;">Swap Courses</a> team</p>
                <hr style="border: 0.5px solid #FFFFFF; width: 100%; margin: 20px 0;">
                <p style="text-align: center; color: #FFFFFF;">If you didn't sign up for an account, you can safely delete this email</p>
            </div>
            `
        };
        await transporter.sendMail(mailOptions);
        logger.info('Confirmation Email sent');
    } catch (error) {
        logger.error("Error sending confirmation email: ", error);
    }

};

const sendResetPasswordEmail = async (email, token) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: 'Reset your password',
            html: `
            <div style="background-color: #23272B; padding: 20px; border-radius: 10px; width: 500px; margin: 0 auto;">
                <h1 style="text-align: center; color: #FFFFFF;">Reset your password</h1>
                <p style="text-align: center; color: #FFFFFF;">Please click the button below to reset your password.</p>
                <a href="http://${process.env.CLIENT_URL}/reset-password?token=${token}" style="text-decoration: none; display: block; margin: 0 auto; width: 200px; background-color: #17A2B8; color: #f2f2f2; padding: 10px; border-radius: 10px; text-align: center;">Reset password</a>
                <p style="text-align: center; color: #FFFFFF;">If you can't click on the button, please copy the following link to your browser</p>
                <p style="text-align: center; color: #17A2B8;">"http://${process.env.CLIENT_URL}/reset-password?token=${token}"</p>
                <br>
                <p style="text-align: center; color: #FFFFFF;">Thank you for using our website</p>
                <p style="text-align: center; color: #FFFFFF;">The <a href="http://${process.env.CLIENT_URL}" style="text-decoration: none; color: #17A2B8;">Swap Courses</a> team</p>
                <hr style="border: 0.5px solid #FFFFFF; width: 100%; margin: 20px 0;">
                <p style="text-align: center; color: #FFFFFF;">If you didn't request to reset your password, you can safely delete this email</p>
            </div>
            `
        };
        await transporter.sendMail(mailOptions);
        logger.info('Reset Password Email sent');
    } catch (error) {
        logger.error("Error sending reset password email: ", error);
    }
};

const sendPasswordChangedEmail = async (email) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: 'Password changed',
            html: `
            <div style="background-color: #f2f2f2; padding: 20px; border-radius: 10px; width: 500px; margin: 0 auto;">
                <h1 style="text-align: center; color: #4d4d4d;">Password changed</h1>
                <p style="text-align: center; color: #4d4d4d;">Your password has been changed successfully.</p>
                <p style="text-align: center; color: #4d4d4d;">If you didn't change your password, please contact us immediately at <a href="mailto:${process.env.EMAIL}" style="text-decoration: none; color: #4d4d4d;">${process.env.EMAIL}</a></p>
                <br>
                <p style="text-align: center; color: #4d4d4d;">Thank you for using our website</p>
                <p style="text-align: center; color: #4d4d4d;">The <a href="http://${process.env.CLIENT_URL}" style="text-decoration: none; color: #4d4d4d;">Swap Courses</a> team</p>
            </div>
            `
        };
        await transporter.sendMail(mailOptions);
        logger.info('Password changed email sent');
    } catch (error) {
        logger.error("Error sending password changed email: ", error);
    }
};

// send a notification email to the user that a match has been found for his swap request
const sendMatchFoundEmail = async (email, course, offeredTimeslot, wantedTimeslot, otherUserEmail, otherUserName) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: 'Congratulations! You have a new match!',
            html: `
            <div style="background-color: #23272B; padding: 20px; border-radius: 10px; width: 500px; margin: 0 auto;">
                <h1 style="text-align: center; color: #FFFFFF;">Congratulations! You have a new match!</h1>
                <p style="text-align: center; color: #FFFFFF;">You have a match for the course <b>${course.code} - ${course.name} ${offeredTimeslot.type}</b> with <b>${otherUserName}</b>.</p>
                <p style="text-align: center; color: #FFFFFF;">You offered the timeslot <b>${offeredTimeslot.day} ${offeredTimeslot.startTime} - ${offeredTimeslot.endTime}</b> of group <b>${offeredTimeslot.group}</b> and you wanted the timeslot <b>${wantedTimeslot.day} ${wantedTimeslot.startTime} - ${wantedTimeslot.endTime}</b> of group <b>${wantedTimeslot.group}</b>.</p>
                <p style="text-align: center; color: #FFFFFF;">You can contact your match at <a href="mailto:${otherUserEmail}" style="text-decoration: none; color: #17A2B8;">${otherUserEmail}</a></p>
                <p style="text-align: center; color: #FFFFFF;">Once you have agreed on the swap, you can confirm it on the <a href="http://${process.env.CLIENT_URL}/swap" style="text-decoration: none; color: #17A2B8;">My Swaps</a> page.</p>
                <br>
                <p style="text-align: center; color: #FFFFFF;">Thank you for using our website</p>
                <p style="text-align: center; color: #FFFFFF;">The <a href="http://${process.env.CLIENT_URL}" style="text-decoration: none; color: #17A2B8;">Swap Courses</a> team</p>
            </div>
            `
        };
        await transporter.sendMail(mailOptions);
        logger.info('Match found email sent');
    } catch (error) {
        logger.error("Error sending match found email: ", error);
    }
};



module.exports = {
    sendEmail,
    sendConfirmationEmail,
    sendMatchFoundEmail,
    sendResetPasswordEmail,
    sendPasswordChangedEmail
};