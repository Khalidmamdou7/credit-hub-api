const {getDriver} = require('../neo4j');
const ValidationError = require('../errors/validation.error');
const NotFoundError = require('../errors/not-found.error');
const {validateCourseCode, validateProgramCode, validateYear, validateSemesterSeason} = require('../utils/validation');

const addCourseMap = async (user, courseMapName, programCode, startingYear) => {
    programCode = validateProgramCode(programCode);
    startingYear = validateYear(startingYear);
    startingYear = parseInt(startingYear);

    driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.writeTransaction(tx =>
            tx.run(
                `
                MATCH (p:Program {code: $programCode})
                MATCH (u:User {email: $userEmail})
                CREATE (u)-[:CREATED]->(cm:CourseMap {
                    name: $courseMapName,
                    id: randomUUID()
                })-[:BELONGS_TO]->(p)
                WITH u, cm, p

                MATCH (p)-[r:REQUIRES]-(c:Course)
                CREATE (cm)-[:CONTAINS {taken: false, outdegree: size((c)-[:PREREQUISITE]->()) , lastPrereqSemesterOrder: -1}]->(c)
                with DISTINCT u, cm, p

                // generate semesters for course map for 5 years
                FOREACH (i IN range(0, 4) |
                    CREATE (cm)-[:HAS_SEMESTER]->(sF:Semester {
                        season: 'Fall',
                        year: $startingYear + i,
                        order: 3*i+1, 
                        id: randomUUID()
                    })
                    CREATE (cm)-[:HAS_SEMESTER]->(sS:Semester {
                        season: 'Spring',
                        year: $startingYear + i + 1,
                        order: 3*i+2, 
                        id: randomUUID()
                    })
                    CREATE (cm)-[:HAS_SEMESTER]->(sSU:Semester {
                        season: 'Summer',
                        year: $startingYear + i + 1,
                        order: 3*i+3, 
                        id: randomUUID()
                    }))
                WITH u, cm, p
                MATCH (cm)-[:HAS_SEMESTER]->(s:Semester)
                WITH DISTINCT u, cm, p, s order by s.order
                RETURN u, cm, p, collect(s) as semesters`,
                {userEmail: user.email, programCode, courseMapName, startingYear}
            )
        );
        if (res.records.length === 0) {
            throw new NotFoundError('Program not found');
        }
        const program = res.records[0].get('p').properties;
        const courseMap = res.records[0].get('cm').properties;
        courseMap.program = program;
        courseMap.semesters = res.records[0].get('semesters').map(semester => {
            semester.properties.order = semester.properties.order.low;
            return semester.properties;
        })
        
        return courseMap;
    } catch (error) {
        if (error.code === 'Neo.ClientError.Schema.ConstraintValidationFailed') {
            throw new ValidationError('Course map already exists');
        }
        throw error;
    } finally {
        await session.close();
    }
}

const getCourseMaps = async (user) => {
    driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.readTransaction(tx =>
            tx.run(
                `MATCH (u:User {email: $userEmail})-[:CREATED]->(cm:CourseMap)
                RETURN cm`,
                {userEmail: user.email}
            )
        );
        const courseMaps = res.records.map(record => record.get('cm').properties);
        return courseMaps;
    } finally {
        await session.close();
    }
}

const addSemesterToCourseMap = async (user, courseMapId, semesterSeason, semesterYear) => {
    semesterSeason = validateSemesterSeason(semesterSeason);
    semesterYear = validateYear(semesterYear);
    
    driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.writeTransaction(tx =>
            tx.run(
                `MATCH (u:User {email: $userEmail})-[:CREATED]->(cm:CourseMap {id: $courseMapId})
                CREATE (cm)-[:HAS_SEMESTER]->(s:Semester {
                    season: $semesterSeason,
                    year: $semesterYear,
                    order: size((cm)-[:HAS_SEMESTER]->()), 
                    id: randomUUID()
                })
                RETURN cm, s`,
                {userEmail: user.email, courseMapId, semesterSeason, semesterYear}
            )
        );
        if (res.records.length === 0) {
            throw new NotFoundError('Course map not found');
        }
        const semester = res.records[0].get('s').properties;
        semester.order = semester.order.low;
        return semester;
    }
    finally {
        await session.close();
    }
}

const getSemesters = async (user, courseMapId) => {
    driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.readTransaction(tx =>
            tx.run(
                `MATCH (u:User {email: $userEmail})-[:CREATED]->(cm:CourseMap {id: $courseMapId})-[:HAS_SEMESTER]->(s:Semester)
                RETURN s
                ORDER BY s.order`,
                {userEmail: user.email, courseMapId}
            )
        );
        const semesters = res.records.map(record => {
            const semester = record.get('s').properties;
            semester.order = semester.order.low;
            return semester;
        });
        return semesters;
    } finally {
        await session.close();
    }
}

const addCourseToSemester = async (user, courseMapId, semesterId, courseCode) => {
    courseCode = validateCourseCode(courseCode);

    driver = getDriver();
    const session = driver.session();
    try {
        // check if course exists in course map
        const res = await session.readTransaction(tx =>
            tx.run(
                `MATCH (u:User {email: $userEmail})-[:CREATED]->(cm:CourseMap {id: $courseMapId})-[:CONTAINS]->(c:Course {code: $courseCode})
                RETURN c`,
                {userEmail: user.email, courseMapId, courseCode}
            )
        );
        if (res.records.length === 0) {
            throw new ValidationError('Course does not exist in course map');
        }

        // check if the course is already taken or one of its prerequisites is not taken
        const res2 = await session.readTransaction(tx =>
            tx.run(
                `MATCH (u:User {email: $userEmail})-[:CREATED]->(cm:CourseMap {id: $courseMapId})-[:CONTAINS]->(c:Course {code: $courseCode})
                Match (cm)-[:HAS_SEMESTER]->(s:Semester {id: $semesterId})
                MATCH (cm)-[cont:CONTAINS {taken: false , outdegree: 0}]->(c:Course {code: $courseCode})
                WHERE cont.lastPrereqSemesterOrder < s.order
                RETURN c`,
                {userEmail: user.email, courseMapId, semesterId, courseCode}
            )
        );
        if (res2.records.length === 0) {
            throw new ValidationError('Course is already taken or one of its prerequisites is not taken yet');
        }
        const courseCreditHours = res2.records[0].get('c').properties.credits;

        // check if the prerequisite credit hours of the past semesters is equal to or greater than the course's prerequisite credit hours
        const res3 = await session.readTransaction(tx =>
            tx.run(
                `MATCH (u:User {email: $userEmail})-[:CREATED]->(cm:CourseMap {id: $courseMapId})-[:HAS_SEMESTER]->(s:Semester {id: $semesterId})
                MATCH (cm)-[:HAS_SEMESTER]->(s2:Semester)
                WHERE s2.order < s.order
                MATCH (s2)-[:TAKES]->(c:Course)
                WITH sum(c.credits) AS credits
                MATCH (cm)-[:CONTAINS]->(c:Course {code: $courseCode})
                WHERE credits >= c.prerequisiteHours
                RETURN c`,
                {userEmail: user.email, courseMapId, semesterId, courseCode}
            )
        );
        if (res3.records.length === 0) {
            throw new ValidationError('Credit hours of the past semesters is less than the course\'s prerequisite credit hours');
        }

        // check if the number of credits taken in this semester is less than or equal to 21
        const res4 = await session.readTransaction(tx =>
            tx.run(
                `MATCH (s:Semester {id: $semesterId})-[:TAKES]->(c:Course)
                RETURN sum(c.credits) AS credits`,
                {semesterId}
            )
        );
        const semesterCreditHours = res4.records[0].get('credits');
        console.log("semesterCreditHours before adding course: " + semesterCreditHours);
        if (semesterCreditHours + courseCreditHours > 21) {
            throw new ValidationError('Cannot take more than 21 credit hours in a semester');
        }


        // add course to semester and update the course's prerequisites outdegree
        const resWrite = await session.writeTransaction(tx =>
            tx.run(
                `MATCH (cm:CourseMap {id: $courseMapId})-[:HAS_SEMESTER]->(s:Semester {id: $semesterId})
                MATCH (cm)-[cont:CONTAINS]->(c:Course {code: $courseCode})
                
                
                OPTIONAL MATCH (c2:Course)-[:PREREQUISITE]->(c)
                OPTIONAL MATCH (cm)-[cont2:CONTAINS {taken: false}]->(c2)
                SET cont2.outdegree = cont2.outdegree - 1
                SET cont2.lastPrereqSemesterOrder = CASE WHEN cont2.lastPrereqSemesterOrder < s.order THEN s.order ELSE cont2.lastPrereqSemesterOrder END
                
                
                WITH DISTINCT c, s, cm, cont
                
                CREATE (s)-[:TAKES]->(c)
                SET cont.taken = true
                
                RETURN cm, s, c`,
                {courseMapId, semesterId, courseCode}
            )
        );
        if (resWrite.records.length === 0) {
            throw new NotFoundError('Course could not be added to semester');
        }

        let semester = resWrite.records[0].get('s').properties;
        semester.addedCourse = resWrite.records[0].get('c').properties;        

        return semester;
    }
    finally {
        await session.close();
    }
}

const areCoursesInCourseMap = async (session, courseMapId, courseCodes) => {
    const res = await session.readTransaction(tx =>
        tx.run(
            `MATCH (cm:CourseMap {id: $courseMapId})-[:CONTAINS]->(c:Course)
            WHERE c.code IN $courseCodes
            RETURN c`,
            {courseMapId, courseCodes}
        )
    );
    if (res.records.length !== courseCodes.length) {
        throw new ValidationError('One or more courses do not exist in course map');
    }
}

const areCoursesPrereqsTaken = async (session, courseMapId, semesterId, courseCodes) => {
    const res2 = await session.readTransaction(tx =>
        tx.run(
            `MATCH (cm:CourseMap {id: $courseMapId})-[:CONTAINS]->(c:Course)
            WHERE c.code IN $courseCodes
            MATCH (cm)-[:HAS_SEMESTER]->(s:Semester {id: $semesterId})
            MATCH (cm)-[cont:CONTAINS {taken: false , outdegree: 0}]->(c:Course)
            WHERE cont.lastPrereqSemesterOrder < s.order
            RETURN c`,
            {courseMapId, semesterId, courseCodes}
        )
    );
    if (res2.records.length !== courseCodes.length) {
        throw new ValidationError('One or more courses are already taken or one of their prerequisites is not taken yet');
    }
}

const areCoursesPrereqCreditHoursMet = async (session, courseMapId, semesterId, courseCodes) => {
    const res3 = await session.readTransaction(tx =>
        tx.run(
            `MATCH (cm:CourseMap {id: $courseMapId})-[:HAS_SEMESTER]->(s:Semester {id: $semesterId})
            MATCH (cm)-[:HAS_SEMESTER]->(s2:Semester)
            WHERE s2.order < s.order AND s2 <> s
            MATCH (s2)-[:TAKES]->(c:Course)
            WITH sum(c.credits) AS credits
            MATCH (cm)-[:CONTAINS]->(c:Course)
            WHERE c.code IN $courseCodes
            AND credits >= c.prerequisiteHours
            RETURN c`,
            {courseMapId, semesterId, courseCodes}
        )
    );
    if (res3.records.length !== courseCodes.length) {
        throw new ValidationError('Credit hours of the past semesters is less than the course\'s prerequisite credit hours');
    }
    const courses = res3.records.map(record => record.get('c').properties);
    return courses;
}

const areSemesterCreditHoursExceeded = async (session, semesterId, courses) => {
    const res4 = await session.readTransaction(tx =>
        tx.run(
            `MATCH (s:Semester {id: $semesterId})-[:TAKES]->(c:Course)
            RETURN sum(c.credits) AS credits`,
            {semesterId}
        )
    );
    const semesterCreditHours = res4.records[0].get('credits');
    console.log("semesterCreditHours before adding course: " + semesterCreditHours);
    if (semesterCreditHours + courses.reduce((sum, course) => sum + course.credits, 0) > 21) {
        throw new ValidationError('Cannot take more than 21 credit hours in a semester');
    }
}

const addCoursesToSemesterAndUpdateDependentCourses = async (session, courseMapId, semesterId, courseCodes) => {
    const resWrite = await session.writeTransaction(tx =>
        tx.run(
            `MATCH (cm:CourseMap {id: $courseMapId})-[:HAS_SEMESTER]->(s:Semester {id: $semesterId})
            MATCH (cm)-[cont:CONTAINS]->(c:Course)
            WHERE c.code IN $courseCodes

            OPTIONAL MATCH (c2:Course)-[:PREREQUISITE]->(c)
            OPTIONAL MATCH (cm)-[cont2:CONTAINS {taken: false}]->(c2)
            SET cont2.outdegree = cont2.outdegree - 1
            SET cont2.lastPrereqSemesterOrder = CASE WHEN cont2.lastPrereqSemesterOrder < s.order THEN s.order ELSE cont2.lastPrereqSemesterOrder END

            WITH DISTINCT collect(c) AS courses, s, cm, cont

            UNWIND courses AS c
            MERGE (s)-[:TAKES]->(c)
            SET cont.taken = true

            RETURN DISTINCT cm, s, c`,
            {courseMapId, semesterId, courseCodes}
        )
    );
    if (resWrite.records.length === 0) {
        throw new ValidationError('Courses could not be added to semester');
    }

    let semester = resWrite.records[0].get('s').properties;
    semester.order = semester.order.low;
    semester.addedCourses = resWrite.records.map(record => record.get('c').properties);

    return semester;
}

const addCoursesToSemester = async (user, courseMapId, semesterId, courseCodes) => {
    courseCodes = courseCodes.map(courseCode => validateCourseCode(courseCode));

    driver = getDriver();
    const session = driver.session();
    try {

        await areCoursesInCourseMap(session, courseMapId, courseCodes);

        await areCoursesPrereqsTaken(session, courseMapId, semesterId, courseCodes);

        const courses = await areCoursesPrereqCreditHoursMet(session, courseMapId, semesterId, courseCodes);

        await areSemesterCreditHoursExceeded(session, semesterId, courses);
        
        const semester = await addCoursesToSemesterAndUpdateDependentCourses(session, courseMapId, semesterId, courseCodes);

        return semester;
        
    } finally {
        await session.close();
    }
}


const getAvailableCourses = async (user, courseMapId, semesterId) => {
    driver = getDriver();
    const session = driver.session();
    try {
        // get courses that are not taken and have no prerequisites or all prerequisites are taken
        const res = await session.readTransaction(tx =>
            tx.run(
                `MATCH (cm:CourseMap {id: $courseMapId})-[:HAS_SEMESTER]->(s:Semester {id: $semesterId})
                MATCH (cm)-[cont:CONTAINS {taken: false, outdegree: 0}]->(c:Course)
                WHERE cont.lastPrereqSemesterOrder < s.order
                RETURN c`,
                {userEmail: user.email, courseMapId, semesterId}
            )
        );
        const coursesCodes = res.records.map(record => record.get('c').properties.code);
        
        // check if the prerequisite credit hours of the past semesters is equal to or greater than the course's prerequisite credit hours
        const res2 = await session.readTransaction(tx =>
            tx.run(
                `MATCH (cm:CourseMap {id: $courseMapId})-[:HAS_SEMESTER]->(s:Semester {id: $semesterId})
                OPTIONAL MATCH (cm)-[:HAS_SEMESTER]->(s2:Semester)
                WHERE s2.order < s.order
                OPTIONAL MATCH (s2)-[:TAKES]->(c:Course)
                WITH sum(c.creditHours) AS creditHours, cm, s
                
                MATCH (cm)-[cont:CONTAINS]->(c:Course)
                WHERE c.code IN $coursesCodes AND c.prerequisiteHours <= creditHours
                RETURN c, cont.group`,
                {userEmail: user.email, courseMapId, semesterId, coursesCodes}
            )
        );
        let availableCourses = res2.records.map(record => {
            const course = record.get('c').properties;
            course.group = record.get('cont.group') || null;
            return course;
        });

        // check if the number of credits taken in this semester is less than or equal to 21
        const res4 = await session.readTransaction(tx =>
            tx.run(
                `MATCH (s:Semester {id: $semesterId})-[:TAKES]->(c:Course)
                RETURN sum(c.credits) AS credits`,
                {semesterId}
            )
        );
        const semesterCreditHours = res4.records[0].get('credits');
        availableCourses = availableCourses.filter(course => semesterCreditHours + course.credits <= 21);

        return availableCourses;
    } finally {
        await session.close();
    }
}

const getCoursesBySemester = async (user, courseMapId, semesterId) => {
    driver = getDriver();
    const session = driver.session();
    try {
        const res = await session.readTransaction(tx =>
            tx.run(
                `MATCH (u:User {email: $userEmail})-[:CREATED]->(cm:CourseMap {id: $courseMapId})-[:HAS_SEMESTER]->(s:Semester {id: $semesterId})-[:TAKES]->(c:Course)
                MATCH (cm)-[cont:CONTAINS]->(c)
                RETURN c, cont.group`,
                {userEmail: user.email, courseMapId, semesterId}
            )
        );
        const courses = res.records.map(record => {
            const course = record.get('c').properties;
            course.group = record.get('cont.group') || null;
            return course;
        });
        return courses;
    } finally {
        await session.close();
    }
}

const removeCourseFromSemester = async (user, courseMapId, semesterId, courseCode) => {
    courseCode = validateCourseCode(courseCode);


    driver = getDriver();
    const session = driver.session();
    try {
        // check if course is in semester
        // check if there are any courses that depend on this course that are taken, if so, don't allow removal of course
        // after removing course, check if any courses that depend on this course and update outdegree
        const res = await session.readTransaction(tx =>
            tx.run(
                `MATCH (u:User {email: $userEmail})-[:CREATED]->(cm:CourseMap 
                    {id: $courseMapId})-[:HAS_SEMESTER]->(s:Semester {id: $semesterId})-[t:TAKES]->(c:Course {code: $courseCode})
                OPTIONAL MATCH (cm)-[cont:CONTAINS {taken: true}]->(c2:Course)-[:PREREQUISITE]->(c)

                RETURN cm, s, c, cont, collect(c2) as prereqs`,
                {userEmail: user.email, courseMapId, semesterId, courseCode}
            )
        );
        if (res.records.length === 0) {
            throw new NotFoundError('Course not found in semester');
        }
        
        const prereqs = res.records[0].get('prereqs');
        if (prereqs.length > 0) {
            throw new ValidationError('Cannot remove course because it is a prerequisite for other taken courses, remove those courses first and try again\n'
            + prereqs.map(c => c.properties.code).join(', '));
        }
        
        const c = res.records[0].get('c').properties;
        const res2 = await session.writeTransaction(tx =>
            tx.run(
                `MATCH (u:User {email: $userEmail})-[:CREATED]->(cm:CourseMap
                    {id: $courseMapId})-[:HAS_SEMESTER]->(s:Semester {id: $semesterId})-[t:TAKES]->(c:Course {code: $courseCode})
                MATCH (cm)-[cont:CONTAINS]->(c)
                
                DELETE t
                SET cont.taken = false
                
                WITH cm, s, c
                OPTIONAL MATCH (cm)-[cont2:CONTAINS {taken: false}]->(c2:Course)-[:PREREQUISITE]->(c)
                SET cont2.outdegree = cont2.outdegree + 1

                RETURN cm, s, c`,
                {userEmail: user.email, courseMapId, semesterId, courseCode}
            )
        );
        const courseMap = res.records[0].get('cm').properties;
        const semester = res.records[0].get('s').properties;
        return {courseMap, semester};
    }
    finally {
        await session.close();
    }
}

module.exports = {
    addCourseMap,
    getCourseMaps,
    addSemesterToCourseMap,
    getSemesters,
    addCourseToSemester,
    addCoursesToSemester,
    getAvailableCourses,
    getCoursesBySemester,
    removeCourseFromSemester
};