const {getDriver} = require('../neo4j');
const ValidationError = require('../errors/validation.error');
const NotFoundError = require('../errors/not-found.error');
const {validateCourseCode, validateProgramCode, validateProgramName} = require('../utils/validation');


const addProgram = async (code, name) => {

    code = validateProgramCode(code);
    name = validateProgramName(name);

    driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.writeTransaction(tx =>
            tx.run(
                `CREATE (p:Program {
                    code: $code,
                    name: $name
                })
                RETURN p`,
                {code, name}
            )
        );
        return res.records[0].get('p').properties;
    } catch (error) {
        if (error.code === 'Neo.ClientError.Schema.ConstraintValidationFailed') {
            throw new ValidationError('Program already exists');
        }
        throw error;
    } finally {
        await session.close();
    }
}

const getAllPrograms = async () => {
    driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.readTransaction(tx =>
            tx.run(
                `MATCH (p:Program)
                RETURN p`
            )
        );
        const programs = res.records.map(record => record.get('p').properties);
        return programs;
    } finally {
        await session.close();
    }
}

const getProgram = async (code) => {
    code = validateProgramCode(code);

    driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.readTransaction(tx =>
            tx.run(
                `MATCH (p:Program {code: $code})
                RETURN p`,
                {code}
            )
        );
        if (res.records.length === 0) {
            throw new NotFoundError('Program not found');
        }
        return res.records[0].get('p').properties;
    } finally {
        await session.close();
    }
}

const deleteProgram = async (code) => {
    code = validateProgramCode(code);

    driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.writeTransaction(tx =>
            tx.run(
                `MATCH (p:Program {code: $code})
                DETACH DELETE p`,
                {code}
            )
        );
        if (res.summary.counters.nodesDeleted() === 0) {
            throw new NotFoundError('Program not found');
        }
    } finally {
        await session.close();
    }
}

const updateProgram = async (code, newCode, newName) => {
    code = validateProgramCode(code);
    newCode = validateProgramCode(newCode);
    newName = validateProgramName(newName);

    driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.writeTransaction(tx =>
            tx.run(
                `MATCH (p:Program {code: $code})
                SET p.code = $newCode, p.name = $newName
                RETURN p`,
                {code, newCode, newName}
            )
        );
        if (res.records.length === 0) {
            throw new NotFoundError('Program not found');
        }
        return res.records[0].get('p').properties;
    } finally {
        await session.close();
    }
}

const addCourseToProgram = async (programCode, courseCode) => {
    courseCode = validateCourseCode(courseCode);
    programCode = validateProgramCode(programCode);

    driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.writeTransaction(tx =>
            tx.run(
                `MATCH (p:Program {code: $programCode})
                MATCH (c:Course {code: $courseCode})
                MERGE (p)-[:REQUIRES]->(c)
                RETURN p`,
                {programCode, courseCode}
            )
        );
        if (res.records.length === 0) {
            throw new NotFoundError('Program or course not found');
        }
        return res.records[0].get('p').properties;
    } finally {
        await session.close();
    }
}

const removeCourseFromProgram = async (programCode, courseCode) => {
    courseCode = validateCourseCode(courseCode);
    programCode = validateProgramCode(programCode);

    driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.writeTransaction(tx =>
            tx.run(
                `MATCH (p:Program {code: $programCode})
                MATCH (c:Course {code: $courseCode})
                MATCH (p)-[r:REQUIRES]-(c)
                DELETE r
                RETURN p`,
                {programCode, courseCode}
            )
        );
        if (res.records.length === 0) {
            throw new NotFoundError('Program or course not found');
        }
        return res.records[0].get('p').properties;
    } finally {
        await session.close();
    }
}

const getProgramCourses = async (programCode) => {
    programCode = validateProgramCode(programCode);

    driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.readTransaction(tx =>
            tx.run(
                `MATCH (p:Program {code: $programCode})
                MATCH (p)-[:REQUIRES]-(c:Course)
                RETURN c`,
                {programCode}
            )
        );
        if (res.records.length === 0) {
            throw new NotFoundError('Program not found');
        }
        const courses = res.records.map(record => record.get('c').properties);
        return courses;
    } finally {
        await session.close();
    }
}


module.exports = {
    addProgram,
    getProgram,
    getAllPrograms,
    updateProgram,
    deleteProgram,
    addCourseToProgram,
    removeCourseFromProgram,
    getProgramCourses
};