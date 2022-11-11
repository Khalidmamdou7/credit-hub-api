const courseMapsRouter = require('express').Router();
const courseMapService = require('../services/course-maps.services');

const passport = require('passport');

/**
 * @swagger
 * components:
 *  schemas:
 *      CourseMap:
 *          type: object
 *          required:
 *              - name
 *              - programCode
 *          properties:
 *              name:
 *                  type: string
 *                  description: The course map name
 *              programCode:
 *                  type: string
 *                  description: The program code
 *          example:
 *              name: "CCEC Plan A"
 *              programCode: "CCE"
 */

/**
 * @swagger
 * /api/course-maps:
 *  post:
 *      summary: Create a new course map
 *      tags:
 *          - Course Maps
 *      security:
 *          - BearerAuth: []
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      $ref: '#/components/schemas/CourseMap'
 *      responses:
 *          201:
 *              description: The course map created
 *          401:
 *              description: Unauthorized
 *          403:
 *              description: Forbidden
 *          500:
 *              description: Internal server error
 */

courseMapsRouter.post('/', passport.authenticate('jwt', { session: false }), async (req, res, next) => {
    let { name, programCode } = req.body;

    if (!name || !programCode) {
        return res.status(400).json({ error: 'Missing one or more of required fields: name, programCode' });
    }

    try {
        const courseMap = await courseMapService.addCourseMap(req.user, name, programCode);
        res.status(201).json(courseMap);
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/course-maps:
 *  get:
 *      summary: Get all course maps
 *      tags:
 *          - Course Maps
 *      security:
 *          - BearerAuth: []
 *      responses:
 *          200:
 *              description: The course maps
 *          401:
 *              description: Unauthorized
 *          500:
 *              description: Internal server error
 */

courseMapsRouter.get('/', passport.authenticate('jwt', { session: false }), async (req, res, next) => {
    try {
        const courseMaps = await courseMapService.getCourseMaps(req.user);
        res.json(courseMaps);
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/course-maps/{id}/semesters:
 *  post:
 *      summary: Add a semester to a course map
 *      tags:
 *          - Course Maps
 *      security:
 *          - BearerAuth: []
 *      parameters:
 *          - in: path
 *            name: id
 *      schema:
 *          type: string
 *          required: true
 *          description: The course map id
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          semesterYear:
 *                              type: integer
 *                          semesterSeason:
 *                              type: string
 *                      required:
 *                          - semesterYear
 *                          - semesterSeason
 *                      example:
 *                          semesterYear: 2021
 *                          semesterSeason: "F"
 *      responses:
 *          201:
 *              description: The semester added to the course map
 *          401:
 *              description: Unauthorized
 *          403:
 *              description: Forbidden
 *          500:
 *              description: Internal server error
 */

courseMapsRouter.post('/:id/semesters', passport.authenticate('jwt', { session: false }), async (req, res, next) => {
    const { semesterYear, semesterSeason } = req.body;
    const { id } = req.params;

    if (!id || !semesterYear || !semesterSeason) {
        return res.status(400).json({ error: 'Missing one or more of required fields: semesterYear, semesterSeason, courseMapId' });
    }

    try {
        const semester = await courseMapService.addSemesterToCourseMap(req.user, id, semesterYear, semesterSeason);
        res.status(201).json(semester);
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/course-maps/{courseMapId}/semesters:
 *  get:
 *      summary: Get all semesters for a course map
 *      tags:
 *          - Course Maps
 *      security:
 *          - BearerAuth: []
 *      parameters:
 *          - in: path
 *            name: courseMapId
 *      schema:
 *          type: string
 *          required: true
 *          description: The course map id
 *      responses:
 *          200:
 *              description: The semesters for the course map
 *          401:
 *              description: Unauthorized
 *          500:
 *              description: Internal server error
 */

courseMapsRouter.get('/:courseMapId/semesters', passport.authenticate('jwt', { session: false }), async (req, res, next) => {
    const { courseMapId } = req.params;

    if (!courseMapId) {
        return res.status(400).json({ error: 'Missing courseMapId' });
    }

    try {
        const semesters = await courseMapService.getSemesters(req.user, courseMapId);
        res.json(semesters);
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/course-maps/{courseMapId}/semesters/{semesterId}/courses/{courseCode}:
 *  post:
 *      summary: Add a course to a semester
 *      tags:
 *          - Course Maps
 *      security:
 *          - BearerAuth: []
 *      parameters:
 *          - in: path
 *            name: courseMapId
 *            schema:
 *              type: string
 *              required: true
 *              description: The course map id
 *          - in: path
 *            name: semesterId
 *            schema:
 *              type: string
 *              required: true
 *              description: The semester id
 *          - in: path
 *            name: courseCode
 *            schema:
 *              type: string
 *              required: true
 *              description: The course code
 *      responses:
 *          200:
 *              description: The course added to the semester
 *          401:
 *              description: Unauthorized
 *          403:
 *              description: Forbidden
 *          500:
 *              description: Internal server error
 */

courseMapsRouter.post('/:courseMapId/semesters/:semesterId/courses/:courseCode', passport.authenticate('jwt', { session: false }), async (req, res, next) => {
    let { courseMapId, semesterId, courseCode } = req.params;

    if (!courseMapId || !semesterId || !courseCode) {
        return res.status(400).json({ error: 'Missing one or more of required fields: courseMapId, semesterId, courseCode' });
    }

    try {
        console.log('courseCode', courseCode);
        const course = await courseMapService.addCourseToSemester(req.user, courseMapId, semesterId, courseCode);
        res.json(course);
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/course-maps/{courseMapId}/semesters/{semesterId}/courses:
 *  get:
 *      summary: Get all courses for a semester
 *      tags:
 *          - Course Maps
 *      security:
 *          - BearerAuth: []
 *      parameters:
 *          - in: path
 *            name: courseMapId
 *            schema:
 *              type: string
 *              required: true
 *              description: The course map id
 *          - in: path
 *            name: semesterId
 *            schema:
 *              type: string
 *              required: true
 *              description: The semester id
 *      responses:
 *          200:
 *              description: The courses for the semester
 *          401:
 *              description: Unauthorized
 *          500:
 *              description: Internal server error
 */

courseMapsRouter.get('/:courseMapId/semesters/:semesterId/courses', passport.authenticate('jwt', { session: false }), async (req, res, next) => {
    const { courseMapId, semesterId } = req.params;

    if (!courseMapId || !semesterId) {
        return res.status(400).json({ error: 'Missing one or more of required fields: courseMapId, semesterId' });
    }

    try {
        const courses = await courseMapService.getCoursesBySemester(req.user, courseMapId, semesterId);
        res.json(courses);
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/course-maps/{courseMapId}/semesters/{semesterId}/available-courses:
 *  get:
 *      summary: Get all available courses for a semester
 *      tags:
 *          - Course Maps
 *      security:
 *          - BearerAuth: []
 *      parameters:
 *          - in: path
 *            name: courseMapId
 *            schema:
 *              type: string
 *              required: true
 *              description: The course map id
 *          - in: path
 *            name: semesterId
 *            schema:
 *              type: string
 *              required: true
 *              description: The semester id
 *      responses:
 *          200:
 *              description: The available courses for the semester
 *          401:
 *              description: Unauthorized
 *          500:
 *              description: Internal server error
 */

courseMapsRouter.get('/:courseMapId/semesters/:semesterId/available-courses', passport.authenticate('jwt', { session: false }), async (req, res, next) => {
    const { courseMapId, semesterId } = req.params;

    if (!courseMapId || !semesterId) {
        return res.status(400).json({ error: 'Missing one or more of required fields: courseMapId, semesterId' });
    }

    try {
        const courses = await courseMapService.getAvailableCourses(req.user, courseMapId, semesterId);
        res.json(courses);
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/course-maps/{courseMapId}/semesters/{semesterId}/courses/{courseCode}:
 *  delete:
 *      summary: Remove a course from a semester
 *      tags:
 *          - Course Maps
 *      security:
 *          - BearerAuth: []
 *      parameters:
 *          - in: path
 *            name: courseMapId
 *            schema:
 *              type: string
 *              required: true
 *              description: The course map id
 *          - in: path
 *            name: semesterId
 *            schema:
 *              type: string
 *              required: true
 *              description: The semester id
 *          - in: path
 *            name: courseCode
 *            schema:
 *              type: string
 *              required: true
 *              description: The course code
 *      responses:
 *          200:
 *              description: The course removed from the semester
 *          401:
 *              description: Unauthorized
 *          500:
 *              description: Internal server error
 */

courseMapsRouter.delete('/:courseMapId/semesters/:semesterId/courses/:courseCode', passport.authenticate('jwt', { session: false }), async (req, res, next) => {
    const { courseMapId, semesterId, courseCode } = req.params;

    if (!courseMapId || !semesterId || !courseCode) {
        return res.status(400).json({ error: 'Missing one or more of required fields: courseMapId, semesterId, courseCode' });
    }

    try {
        const course = await courseMapService.removeCourseFromSemester(req.user, courseMapId, semesterId, courseCode);
        res.json(course);
    } catch (error) {
        next(error);
    }
});


module.exports = courseMapsRouter;