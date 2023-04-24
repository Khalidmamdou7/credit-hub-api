const { getDriver } = require('../neo4j');
const ValidationError = require('../errors/validation.error');
const NotFoundError = require('../errors/not-found.error');
const { validateCourseCode, validateSemesterSeason, validateProgramCode } = require('../utils/validation');


const createCourse = async (code, name, credits, availableSemesters) => {
    validateCourseCode(code);
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
                `CREATE (c:Course {
                    code: $code,
                    name: $name,
                    credits: $credits,
                    availableSemesters: $availableSemesters
                })
                RETURN c`,
                { code, name, credits , availableSemesters}
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

const addPrerequisiteCourses = async (code, prerequisiteCodes, programCode) => {
    validateCourseCode(code);
    if (programCode !== 'ALL') {
        programCode = validateProgramCode(programCode);
    }
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
                CREATE (c)-[pr_relation:PREREQUISITE]->(prerequisite)
                SET pr_relation.programCode = $programCode

                RETURN c, prerequisite`,
                { code, prerequisiteCodes, programCode }
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

const removePrerequisiteCourse = async (code, prerequisiteCode, programCode) => {
    validateCourseCode(code);
    validateCourseCode(prerequisiteCode);
    if (programCode !== 'ALL') {
        programCode = validateProgramCode(programCode);
    }

    driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.writeTransaction(tx =>
            tx.run(
                `MATCH (c:Course {code: $code})
                MATCH (p:Course {code: $prerequisiteCode})
                MATCH (c)-[r:PREREQUISITE {programCode: $programCode}]->(p)
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

const getPrerequisiteCourses = async (code, programCode) => {
    validateCourseCode(code);
    if (programCode !== 'ALL') {
        programCode = validateProgramCode(programCode);
    }

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
        const course = res.records[0].get('c').properties;
        const res2 = await session.readTransaction(tx =>
            tx.run(
                `match (c:Course {code: $code})-[pr_relation:PREREQUISITE]->(prereqCourse:Course)
                where pr_relation.programCode = $programCode or pr_relation.programCode = 'ALL'
                return c, collect(prereqCourse) as prereqs`,
                { code, programCode }
            )
        );
        if (res2.records.length === 0) {
            course.prerequisites = [];
            return course;
        }
        const prerequisites = res2.records[0].get('prereqs').map(prereq => prereq.properties);
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