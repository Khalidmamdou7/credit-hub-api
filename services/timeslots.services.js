const { getDriver } = require('../neo4j');
const ValidationError = require('../errors/validation.error');
const NotFoundError = require('../errors/not-found.error');
const validation = require('../utils/validation');

const validateTimeslot = (timeslot) => {
    validation.validateCourseCode(timeslot.courseCode);
    validation.validateSemester(timeslot.semester);
    validation.validateTimeslotType(timeslot.type);
    validation.validateGroup(timeslot.group);
    validation.validateDay(timeslot.day);
    validation.validateTime(timeslot.startTime);
    validation.validateTime(timeslot.endTime);
}

const createTimeslot = async (courseCode, semester, type, group, day, startTime, endTime) => {
    validateTimeslot({ courseCode, semester, type, group, day, startTime, endTime });
    courseCode = courseCode.toUpperCase();
    semester = semester.toUpperCase();
    type = type.toLowerCase();
    type = type.slice(0, 3);
    day = day[0].toUpperCase() + day.slice(1);

    console.log('Creating timeslot with courseCode: ' + courseCode + ', semester: ' + semester + ', type: ' + type + ', group: ' + group + ', day: ' + day + ', startTime: ' + startTime + ', endTime: ' + endTime);
    const driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.writeTransaction(tx =>
            tx.run(
                `MATCH (c:Course {code: $courseCode})
                MERGE (s:Semester {name: $semester})
                MERGE (t:Timeslot {id: randomUUID(), type: $type, group: $group, day: $day, startTime: $startTime, endTime: $endTime})
                MERGE (t)-[:OFFERED_IN]->(s)
                MERGE (c)-[:OFFERED_AT]->(t)
                RETURN t`,
                { courseCode, semester, type, group, day, startTime, endTime }
            )
        );
        if (res.records.length === 0) {
            throw new NotFoundError('Course not found');
        }
        return res.records[0].get('t').properties;
    } finally {
        await session.close();
    }
};

const getTimeslotsByCourseAndSemester = async (courseCode, semester) => {
    validation.validateCourseCode(courseCode);
    validation.validateSemester(semester);
    courseCode = courseCode.toUpperCase();
    semester = semester.toUpperCase();
    
    const driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.readTransaction(tx =>
            tx.run(
                `MATCH (c:Course {code: $courseCode})-[:OFFERED_AT]->(t:Timeslot)-[:OFFERED_IN]->(s:Semester {name: $semester})
                RETURN t`,
                { courseCode, semester }
            )
        );
        if (res.records.length === 0) {
            throw new NotFoundError('Timeslots not found');
        }
        const timeslots = res.records.map(record => record.get('t').properties);
        return timeslots;
    } finally {
        await session.close();
    }
};

module.exports = {
    createTimeslot,
    getTimeslotsByCourseAndSemester
};