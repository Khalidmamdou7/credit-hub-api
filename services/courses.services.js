const { getDriver } = require('../neo4j');
const ValidationError = require('../errors/validation.error');
const NotFoundError = require('../errors/not-found.error');
const { validateCourseCode, validateSemesterSeason, validateYear } = require('../utils/validation');
const logger = require('../configs/logger');


const createCourse = async (code, name, credits, availableSemesters, bylaws = "2018") => {
    validateCourseCode(code);
    name = name.replace(/[^a-zA-Z0-9 ,-]/g, '');
    bylaws = validateYear(bylaws);
    credits = parseInt(credits);
    if (isNaN(credits)) {
        throw new ValidationError('Credits must be a number');
    }
    availableSemesters = availableSemesters.map(validateSemesterSeason);


    driver = getDriver();
    const session = driver.session();
    try {
        query = `CREATE (c:Course {
            code: $code,
            name: $name,
            credits: $credits,
            availableSemesters: $availableSemesters
        })
        SET c:CourseBylaws${bylaws}
        RETURN c`;
        const res = await session.writeTransaction(tx =>
            tx.run(
                query,
                { code, name, credits, availableSemesters }
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

const getAllCourses = async (bylaws = "2018") => {
    bylaws = validateYear(bylaws);
    let courseLabel = (bylaws === "2023") ? "CourseBylaws2023" : "CourseBylaws2018";

    driver = getDriver();
    const session = driver.session();
    try {
        query = `MATCH (c:Course:${courseLabel}) RETURN c`;
        const res = await session.readTransaction(tx =>
            tx.run(query)
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

const updateCourse = async (code, name, credits, availableSemesters) => {
    validateCourseCode(code);
    // sanitize name
    name = name.replace(/[^a-zA-Z0-9 ,-]/g, '');
    credits = parseInt(credits);
    if (isNaN(credits)) {
        throw new ValidationError('Credits must be a number');
    }
    availableSemesters = availableSemesters.map(validateSemesterSeason);

    driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.writeTransaction(tx =>
            tx.run(
                `MATCH (c:Course {code: $code})
                SET c.name = $name
                SET c.credits = $credits
                SET c.availableSemesters = $availableSemesters
                RETURN c`,
                { code, name, credits, availableSemesters }
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

const searchCourses = async (query, limit = 10, bylaws = "2018") => {
    bylaws = validateYear(bylaws);
    if (isNaN(limit) || limit < 1 || limit > 100) {
        throw new ValidationError('Limit must be a number between 1 and 100');
    }
    // sanitize query
    query = query.replace(/[^a-zA-Z0-9 ,-]/g, '');
    query = query + '*';

    indexName = (bylaws === "2023") ? "coursesNamesAndCodesNewBylaws" : "coursesNamesAndCodesOldBylaws";

    driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.readTransaction(tx =>
            tx.run(`
            CALL db.index.fulltext.queryNodes($indexName, $query) YIELD node
            RETURN node LIMIT toInteger($limit)`,
                { indexName, query, limit }
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

const updatePrerequisiteHours = async (code, prerequisiteHours) => {
    validateCourseCode(code);
    
    if (prerequisiteHours < 0 || prerequisiteHours > 175) {
        throw new ValidationError('Prerequisite hours must be between 0 and 175');
    }

    driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.writeTransaction(tx =>
            tx.run(
                `MATCH (c:Course {code: $code})
                SET c.prerequisiteHours = $prerequisiteHours
                RETURN c`,
                { code, prerequisiteHours }
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

module.exports = {
    createCourse,
    getAllCourses,
    getCourse,
    updateCourse,
    deleteCourse,
    searchCourses,
    addPrerequisiteCourses,
    removePrerequisiteCourse,
    getPrerequisiteCourses,
    updatePrerequisiteHours
};