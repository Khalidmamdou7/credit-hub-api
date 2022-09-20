const { getDriver } = require('../neo4j');

const createCourse = async (code, name) => {
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
}


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
            throw new ValidationError('Course not found');
        }
        return res.records[0].get('c').properties;
    } finally {
        await session.close();
    }
};

const updateCourse = async (code, name) => {
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
            throw new ValidationError('Course not found');
        }
        return res.records[0].get('c').properties;
    } finally {
        await session.close();
    }
};

const deleteCourse = async (code) => {
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
            throw new ValidationError('Course not found');
        }
    } finally {
        await session.close();
    }
};

module.exports = {
    createCourse,
    getAllCourses,
    getCourse,
    updateCourse,
    deleteCourse
};