const jwt = require('jsonwebtoken');
const { hash, compare } = require('bcrypt');
const { getDriver } = require('../neo4j');
const validator = require('validator');
const ValidationError = require('../errors/validation.error');


const register = async (email, plainPassword, name) => {
    if (!validator.isEmail(email))
        throw new ValidationError('Invalid email');
    
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
                    name: $name
                })
                RETURN u`,
                { email, encrypted, name }
            )
        );
        
        const user = res.records[0].get('u');
        const { password, ...safeProperties } = user.properties
        const token = jwt.sign(userToClaims(safeProperties), process.env.JWT_SECRET);
        return {
            ...safeProperties,
            token
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

const auth = async (email, plainPassword) => {
    if (!validator.isEmail(email))
        throw new ValidationError('Invalid email');
    
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
    auth,
    userToClaims,
    claimsToUser,
}