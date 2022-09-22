const { getDriver } = require('../neo4j');
const ValidationError = require('../errors/validation.error');
const NotFoundError = require('../errors/not-found.error');

const createTimeslot = async (courseCode, type, group, day, startTime, endTime) => {
    const driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.writeTransaction(tx =>
            tx.run(
                `MATCH (c:Course {code: $courseCode})
                CREATE (c)-[:HAS_TIMESLOT]->(t:Timeslot {
                    type: $type,
                    group: $group,
                    day: $day,
                    startTime: $startTime,
                    endTime: $endTime
                })
                RETURN t`,
                { courseCode, type, group, day, startTime, endTime }
            )
        );
        return res.records[0].get('t').properties;
    } catch (error) {
        if (error.code === 'Neo.ClientError.Schema.ConstraintValidationFailed') {
            throw new ValidationError('Timeslot already exists');
        }
        throw error;
    } finally {
        await session.close();
    }
};

const getTimeslots = async () => {
    const driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.readTransaction(tx =>
            tx.run(
                `MATCH (c:Course)-[:HAS_TIMESLOT]->(t:Timeslot)
                RETURN c.code, t`
            )
        );
        const timeslots = res.records.map(record => {
            const courseCode = record.get('c.code');
            const timeslot = record.get('t').properties;
            return { courseCode, ...timeslot };
        });
        return timeslots;
    } finally {
        await session.close();
    }
};

const getTimeslotsByCourseAndType = async (courseCode, type) => {
    const driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.readTransaction(tx =>
            tx.run(
                `MATCH (c:Course {code: $courseCode})-[:HAS_TIMESLOT]->(t:Timeslot {type: $type})
                RETURN t`,
                { courseCode, type }
            )
        );
        const timeslots = res.records.map(record => record.get('t').properties);
        return timeslots;
    } finally {
        await session.close();
    }
};
