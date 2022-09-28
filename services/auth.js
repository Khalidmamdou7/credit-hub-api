const jwt = require('jsonwebtoken');
const { hash, compare } = require('bcrypt');
const { getDriver } = require('../neo4j');
const validator = require('validator');
const ValidationError = require('../errors/validation.error');
const {sendEmail} = require('../utils/utils');
const NotFoundError = require('../errors/not-found.error');


const register = async (email, plainPassword, name) => {
    if (!validator.isEmail(email))
        throw new ValidationError('Invalid email');
    email = validator.normalizeEmail(email);
    
    if (plainPassword.length < 8) 
        throw new ValidationError('Password must be at least 8 characters');
    

    const encrypted = await hash(plainPassword, parseInt(process.env.SALT_ROUNDS));

    driver = getDriver();
    const session = driver.session();

    try {
        const res = await session.writeTransaction(tx =>
            tx.run(
                `CREATE (u:User {
                    userId: randomUuid(),
                    email: $email,
                    password: $encrypted,
                    name: $name,
                    active: false
                })
                RETURN u`,
                { email, encrypted, name }
            )
        );
        
        const user = res.records[0].get('u');
        const { password, ...safeProperties } = user.properties
        const token = jwt.sign(userToClaims(safeProperties), process.env.JWT_SECRET);
        const { userId } = user.properties;
        
        // send confirmation email
        const subject = 'Confirm your email';
        const text = `Please click on the following link to confirm your email: http://${process.env.DOMAIN}/api/auth/confirm/${userId}/${token}`;
        sendEmail(email, subject, text);
        
        return {
            message: 'Please check your email to confirm your account'
        };

    } catch (error) {
        if (error.code === 'Neo.ClientError.Schema.ConstraintValidationFailed') {
            throw new ValidationError('Email already exists');
        }
        throw error;
    } finally {
        await session.close();
    }
}

const confirmEmail = async (userId, token) => {
    const claims = jwt.verify(token, process.env.JWT_SECRET);
    if (claims.userId !== userId) {
        throw new ValidationError('Invalid token');
    }

    driver = getDriver();
    const session = driver.session();

    try {
        const res = await session.writeTransaction(tx =>
            tx.run(
                `MATCH (u:User {userId: $userId})
                SET u.active = true
                RETURN u`,
                { userId }
            )
        );

        if (res.records.length === 0) {
            throw new NotFoundError('User not found');
        }

        const user = res.records[0].get('u');
        const { password, ...safeProperties } = user.properties
        const newToken = jwt.sign(userToClaims(safeProperties), process.env.JWT_SECRET);

        return {
            token: newToken,
            ...safeProperties
        };
    } catch (error) {
        throw error;
    } finally {
        await session.close();
    }
}

const resendConfirmationEmail = async (email) => {
    if (!validator.isEmail(email))
        throw new ValidationError('Invalid email');
    email = validator.normalizeEmail(email);

    driver = getDriver();
    const session = driver.session();

    try {
        const res = await session.readTransaction(tx =>
            tx.run(
                `MATCH (u:User {email: $email})
                RETURN u`,
                { email }
            )
        );

        if (res.records.length === 0) {
            throw new ValidationError('Email not found');
        }

        const user = res.records[0].get('u');
        const { password, ...safeProperties } = user.properties
        const token = jwt.sign(userToClaims(safeProperties), process.env.JWT_SECRET);
        const { userId } = user.properties;

        const subject = 'Confirm your email';
        const text = `Please click on the following link to confirm your email: http://${process.env.DOMAIN}/api/auth/confirm/${userId}/${token}`;
        sendEmail(email, subject, text);

        return {
            message: 'Please check your email to confirm your account'
        };
    } catch (error) {
        throw error;
    } finally {
        await session.close();
    }
}
    
const auth = async (email, plainPassword) => {
    if (!validator.isEmail(email))
        throw new ValidationError('Invalid email');
    email = validator.normalizeEmail(email);
    
    if (plainPassword.length < 8)
        throw new ValidationError('Password must be at least 8 characters');

    driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.readTransaction(tx =>
            tx.run(
                `MATCH (u:User {email: $email})
                RETURN u`,
                { email }
            )
        );

        if (res.records.length === 0) {
            throw new ValidationError('Email not found');
        }

        if (!res.records[0].get('u').properties.active) {
            throw new ValidationError('Email not confirmed yet.');
        }

        const user = res.records[0].get('u');
        const { password, ...safeProperties } = user.properties;
        const match = await compare(plainPassword, password);
        if (!match) {
            throw new ValidationError('Incorrect password');
        }
        const token = jwt.sign(userToClaims(safeProperties), process.env.JWT_SECRET);
        return {
            ...safeProperties,
            token
        };
    }
    finally {
        await session.close();
    }
}

const userToClaims = (user) => {
    const { name, userId } = user

    return { sub: userId, userId, name, }
}


const claimsToUser = async (claims) => {
    return {
        ...claims,
        userId: claims.sub,
    }
}

module.exports = {
    register,
    confirmEmail,
    resendConfirmationEmail,
    auth,
    userToClaims,
    claimsToUser,
}