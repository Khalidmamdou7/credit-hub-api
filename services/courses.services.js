const { getDriver } = require('../neo4j');
const ValidationError = require('../errors/validation.error');
const NotFoundError = require('../errors/not-found.error');
const { validateCourseCode } = require('../utils/validation');


const createCourse = async (code, name, credits) => {
    validateCourseCode(code);
    name = name.replace(/[^a-zA-Z0-9 ,-]/g, '');
    credits = parseInt(credits);
    if (isNaN(credits)) {
        throw new ValidationError('Credits must be a number');
    }

    driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.writeTransaction(tx =>
            tx.run(
                `CREATE (c:Course {
                    code: $code,
                    name: $name,
                    credits: $credits
                })
                RETURN c`,
                { code, name, credits }
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

const updateCourse = async (code, name, credits) => {
    validateCourseCode(code);
    // sanitize name
    name = name.replace(/[^a-zA-Z0-9 ,-]/g, '');
    credits = parseInt(credits);
    if (isNaN(credits)) {
        throw new ValidationError('Credits must be a number');
    }

    driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.writeTransaction(tx =>
            tx.run(
                `MATCH (c:Course {code: $code})
                SET c.name = $name
                SET c.credits = $credits
                RETURN c`,
                { code, name, credits }
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

const addPrerequisiteCourses = async (code, prerequisiteCodes) => {
    validateCourseCode(code);
    prerequisiteCodes.forEach((prerequisiteCode) => {
        try {
            validateCourseCode(prerequisiteCode);
        } catch (error) {
            // remove invalid prerequisite codes
            prerequisiteCodes.splice(prerequisiteCodes.indexOf(prerequisiteCode), 1);
        }
    });

    if (prerequisiteCodes.length === 0) {
        throw new ValidationError('No valid prerequisite codes provided');
    }

    driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.writeTransaction(tx =>
            tx.run(
                `MATCH (c:Course {code: $code})
                MATCH (prerequisite:Course)
                WHERE prerequisite.code IN $prerequisiteCodes
                MERGE (c)-[:PREREQUISITE]->(prerequisite)
                RETURN c, prerequisite`,
                { code, prerequisiteCodes }
            )
        );
        if (res.records.length === 0) {
            throw new NotFoundError('Course not found');
        }
        const course = res.records[0].get('c').properties;
        const prerequisites = res.records.map(record => record.get('prerequisite').properties);
        course.prerequisites = prerequisites;
        return course;
    } finally {
        await session.close();
    }

};

const removePrerequisiteCourse = async (code, prerequisiteCode) => {
    validateCourseCode(code);
    validateCourseCode(prerequisiteCode);

    driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.writeTransaction(tx =>
            tx.run(
                `MATCH (c:Course {code: $code})
                MATCH (p:Course {code: $prerequisiteCode})
                MATCH (c)-[r:PREREQUISITE]->(p)
                DELETE r
                RETURN c, p, r`,
                { code, prerequisiteCode }
            )
        );
        if (res.records.length === 0) {
            throw new NotFoundError('Course or Relationship not found');
        }
        return res.records[0].get('c').properties;
    } finally {
        await session.close();
    }
};

const getPrerequisiteCourses = async (code) => {
    validateCourseCode(code);

    driver = getDriver();
    const session = driver.session();
    try {
        // check if course exists
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
        const res2 = await session.readTransaction(tx =>
            tx.run(
                `MATCH (c:Course {code: $code})-[:PREREQUISITE]->(p:Course)
                RETURN p`,
                { code }
            )
        );
        const course = res.records[0].get('c').properties;
        const prerequisites = res2.records.map(record => record.get('p').properties);
        course.prerequisites = prerequisites;
        return course;
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
    searchCourses,
    addPrerequisiteCourses,
    removePrerequisiteCourse,
    getPrerequisiteCourses
};