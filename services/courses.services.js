const { getDriver } = require('../neo4j');
const ValidationError = require('../errors/validation.error');
const NotFoundError = require('../errors/not-found.error');

const validateCourseCode = (code) => {
    const regex = /^[A-Z]{2,3}N[0-9]{3}$/;
    if (!regex.test(code)) {
        throw new ValidationError('Invalid course code');
    }
};

const createCourse = async (code, name) => {
    validateCourseCode(code);
    name = name.replace(/[^a-zA-Z0-9 ,-]/g, '');

    driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.writeTransaction(tx =>
            tx.run(
                `CREATE (c:Course {
                    code: $code,
                    name: $name
                })
                RETURN c`,
                { code, name }
            )
        );
        return res.records[0].get('c').properties;
    } catch (error) {
        if (error.code === 'Neo.ClientError.Schema.ConstraintValidationFailed') {
            throw new ValidationError('Course already exists');
        }
        throw error;
    } finally {
        await session.close();
    }
};

const getAllCourses = async () => {
    driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.readTransaction(tx =>
            tx.run(
                `MATCH (c:Course)
                RETURN c`
            )
        );
        const courses = res.records.map(record => record.get('c').properties);
        return courses;
    } finally {
        await session.close();
    }
};

const getCourse = async (code) => {
    validateCourseCode(code);
    driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.readTransaction(tx =>
            tx.run(
                `MATCH (c:Course {code: $code})
                RETURN c`,
                { code }
            )
        );
        if (res.records.length === 0) {
            throw new NotFoundError('Course not found');
        }
        return res.records[0].get('c').properties;
    } finally {
        await session.close();
    }
};

const updateCourse = async (code, name) => {
    validateCourseCode(code);
    // sanitize name
    name = name.replace(/[^a-zA-Z0-9 ,-]/g, '');

    driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.writeTransaction(tx =>
            tx.run(
                `MATCH (c:Course {code: $code})
                SET c.name = $name
                RETURN c`,
                { code, name }
            )
        );
        if (res.records.length === 0) {
            throw new NotFoundError('Course not found');
        }
        return res.records[0].get('c').properties;
    } finally {
        await session.close();
    }
};

const deleteCourse = async (code) => {
    validateCourseCode(code);

    driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.writeTransaction(tx =>
            tx.run(
                `MATCH (c:Course {code: $code})
                DETACH DELETE c RETURN c`,
                { code }
            )
        );
        if (res.records.length === 0) {
            throw new NotFoundError('Course not found');
        }
    } finally {
        await session.close();
    }
};

const searchCourses = async (query) => {
    // sanitize query
    query = query.replace(/[^a-zA-Z0-9 ,-]/g, '');

    query = query + '*';
    driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.readTransaction(tx =>
            tx.run(`
            CALL db.index.fulltext.queryNodes("namesAndCodes", $query) YIELD node
            RETURN node LIMIT 10`, { query }
            )
        );
        const courses = res.records.map(record => record.get('node').properties);
        return courses;
    } finally {
        await session.close();
    }
};


module.exports = {
    createCourse,
    getAllCourses,
    getCourse,
    updateCourse,
    deleteCourse,
    searchCourses
};