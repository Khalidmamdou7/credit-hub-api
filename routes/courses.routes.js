const coursesRouter = require('express').Router();
const coursesService = require('../services/courses.services');
const timeslotsService = require('../services/timeslots.services');
const passport = require('passport');
const logger = require('../configs/logger');

/**
 * @swagger
 * components:
 *  schemas:
 *      Course:
 *          type: object
 *          required:
 *              - code
 *              - name
 *              - credits
 *              - prerequisiteHours
 *          properties:
 *              code:
 *                  type: string
 *                  description: The course code
 *              name:
 *                  type: string
 *                  description: The course name
 *              credits:
 *                  type: integer
 *                  description: The number of credits
 *              prerequisiteHours:
 *                  type: integer
 *                  description: The number of prerequisite hours
 *              availableSemesters:
 *                  type: array
 *                  items:
 *                      type: string
 *                  description: The available semesters
 *          example:
 *              code: "CMPN301"
 *              name: "Computer Architecture"
 *              credits: 3
 *              prerequisiteHours: 0
 *              availableSemesters: ["Fall", "Spring"]
 *      CourseWithPrerequisites:
 *          type: object
 *          required:
 *              - code
 *              - name
 *              - prerequisites
 *          properties:
 *              code:
 *                  type: string
 *                  description: The course code
 *              name:
 *                  type: string
 *                  description: The course name
 *              prerequisites:
 *                  type: array
 *                  items:
 *                      # $ref: '#/components/schemas/Course'
 *          example:
 *              code: "CMPN211"
 *              name: "Microprocessors - II"
 *              prerequisites:
 *                  - code: "CMPN201"
 *                    name: "Microprocessors - I"
 *      Timeslot:
 *          type: object
 *          required:
 *              - group
 *              - day
 *              - startTime
 *              - endTime
 *          properties:
 *              group:
 *                  type: string
 *                  description: The group number
 *              day:
 *                  type: string
 *                  description: The day of the week
 *              startTime:
 *                  type: string
 *                  description: The start time of the course
 *              endTime:
 *                  type: string
 *                  description: The end time of the course
 *          example:
 *              group: "1"
 *              day: "Monday"
 *              startTime: "10:00"
 *              endTime: "12:00"
 */

/**
 * @swagger
 * tags:
 *  name: Courses
 *  description: Courses API
 * /api/courses:
 *  get:
 *      summary: Returns the list of all courses
 *      tags: [Courses]
 *      parameters:
 *          - in: query
 *            name: bylaws
 *            schema:
 *              type: string
 *              enum: [2018, 2023]
 *              description: The year of the bylaws (2018 (old bylaws) or 2023 (new bylaws)
 *      responses:
 *          200:
 *              description: The list of courses
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: array
 *                          items:
 *                              $ref: '#/components/schemas/Course'
 *          500:
 *              description: Server error
 *  post:
 *      summary: Creates a new course
 *      tags: [Courses]
 *      security:
 *          - BearerAuth: []
 *      parameters:
 *         - in: query
 *           name: bylaws
 *           schema:
 *              type: string
 *              enum: [2018, 2023]
 *              description: The year of the bylaws (2018 (old bylaws) or 2023 (new bylaws)
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      $ref: '#/components/schemas/Course'
 *      responses:
 *          201:
 *              description: The course was successfully created
 *              content:
 *                  application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/Course'
 *          422:
 *              description: Validation error (course already exists, invalid course code)
 *          500:
 *              description: Server error
 * /api/courses/{courseCode}:
 *  get:
 *      summary: Get the course with the specified course code
 *      tags: [Courses]
 *      parameters:
 *          - in: path
 *            name: courseCode
 *      schema:
 *          type: string
 *          required: true
 *          description: The course code
 *      responses:
 *          200:
 *              description: The course description by the course code
 *              content:
 *                  application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/Course'
 *          404:
 *              description: The course was not found
 *          422:
 *              description: Validation error (invalid course code)
 *          500:
 *              description: Server error
 * 
 *  put:
 *      summary: Update the course with the specified course code
 *      tags: [Courses]
 *      security:
 *          - BearerAuth: []
 *      parameters:
 *          - in: path
 *            name: courseCode
 *      schema:
 *          type: string
 *          required: true
 *          description: The course code
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      $ref: '#/components/schemas/Course'
 *      responses:
 *          200:
 *              description: The course was updated
 *              content:
 *                  application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/Course'
 *          404:
 *              description: The course was not found
 *          422:
 *              description: Validation error (invalid course code)
 *          500:
 *              description: Server error
 *  delete:
 *      summary: Remove the course with the specified course code
 *      tags: [Courses]
 *      security:
 *          - BearerAuth: []
 *      parameters:
 *          - in: path
 *            name: courseCode
 *      schema:
 *          type: string
 *          required: true
 *          description: The course code
 *      responses:
 *          204:
 *              description: The course was deleted
 *          404:
 *              description: The course was not found
 *          422:
 *              description: Validation error (invalid course code)
 *          500:
 *              description: Server error
 */

coursesRouter.get('/', async (req, res, next) => {
    const bylaws = req.query.bylaws || "2018";

    logger.info(`Get all courses with bylaws: ${bylaws}`);

    try {
        const courses = await coursesService.getAllCourses(bylaws);
        res.json(courses);
    } catch (error) {
        next(error);
    }
});

coursesRouter.get('/:code', async (req, res, next) => {
    const code = req.params.code.toUpperCase();
    try {
        const course = await coursesService.getCourse(code);
        res.json(course);
    } catch (error) {
        next(error);
    }
});

coursesRouter.post('/', passport.authenticate('jwt', {session: false}), async (req, res, next) => {
    const { name, credits } = req.body;
    const code = req.body.code.toUpperCase();
    const availableSemesters = req.body.availableSemesters || [];
    const bylaws = req.query.bylaws || "2018";

    logger.info(`Create course with code: ${code}, name: ${name}, credits: ${credits}, availableSemesters: ${availableSemesters}, bylaws: ${bylaws}`);

    try {
        const course = await coursesService.createCourse(code, name, credits, availableSemesters, bylaws);
        res.json(course);
    } catch (error) {
        next(error);
    }
});

coursesRouter.put('/:code', passport.authenticate('jwt', {session: false}), async (req, res, next) => {
    const code = req.params.code.toUpperCase();
    const { name, credits } = req.body;
    const availableSemesters = req.body.availableSemesters || [];

    try {
        const course = await coursesService.updateCourse(code, name, credits, availableSemesters);
        res.json(course);
    } catch (error) {
        next(error);
    }
});

coursesRouter.delete('/:code', passport.authenticate('jwt', {session: false}), async (req, res, next) => {
    const code = req.params.code.toUpperCase();
    try {
        await coursesService.deleteCourse(code);
        res.sendStatus(204);
    } catch (error) {
        next(error);
    }
});


/**
 * @swagger
 * /api/courses/search/{query}:
 *  get:
 *      summary: Search for courses by course code or course name
 *      tags: [Courses]
 *      parameters:
 *          - in: path
 *            name: query
 *            schema:
 *              type: string
 *              required: true
 *              description: The course code or course name
 *          - in: query
 *            name: limit
 *            schema:
 *              type: integer
 *              description: The maximum number of courses to return (1-100)
 *          - in: query
 *            name: bylaws
 *            schema:
 *              type: string
 *              enum: [2018, 2023]
 *              description: The year of the bylaws (2018 (old bylaws) or 2023 (new bylaws)
 *      responses:
 *          200:
 *              description: The list of courses matching the search query
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: array
 *                          items:
 *                              $ref: '#/components/schemas/Course'
 *          404:
 *              description: No courses found
 *          500:
 *              description: Server error
 */

coursesRouter.get('/search/:query', async (req, res, next) => {
    let query = req.params.query;
    let limit = req.query.limit || 10;
    let bylaws = req.query.bylaws || "2018";
    try {
        logger.info(`Search for courses by query: ${query} ,limit: ${limit}, bylaws: ${bylaws}`);
        const courses = await coursesService.searchCourses(query, limit, bylaws);
        res.json(courses);
    } catch (error) {
        next(error);
    }
});


/**
 * @swagger
 * /api/courses/{courseCode}/semesters/{semester}/timeslots:
 *  get:
 *      summary: Get the timeslots of the course with the specified course code in the specified semester
 *      tags: [Timeslots]
 *      parameters:
 *          - in: path
 *            name: courseCode
 *            schema:
 *              type: string
 *              required: true
 *              description: The course code
 *          - in: path
 *            name: semester
 *            schema:
 *              type: string
 *              required: true
 *              description: The semester (e.g. F22, S23, SU23)
 *      responses:
 *          200:
 *              description: The list of timeslots
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: array
 *                          items:
 *                              $ref: '#/components/schemas/Timeslot'
 *          404:
 *              description: The course was not found
 *          422:
 *              description: Validation error (invalid course code, invalid semester)
 *          500:
 *              description: Server error
 */

coursesRouter.get('/:code/semesters/:semester/timeslots', async (req, res, next) => {
    const { code, semester } = req.params;
    try {
        const timeslots = await timeslotsService.getTimeslotsByCourseAndSemester(code, semester);
        res.json(timeslots);
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/courses/{courseCode}/semesters/{semester}/timeslots/{timeslotType}:
 *  post:
 *      summary: Add a timeslot to the course with the specified course code in the specified semester
 *      tags: [Timeslots]
 *      security:
 *          - BearerAuth: []
 *      parameters:
 *          - in: path
 *            name: courseCode
 *            schema:
 *              type: string
 *              required: true
 *              description: The course code
 *          - in: path
 *            name: semester
 *            schema:
 *              type: string
 *              required: true
 *              description: The semester (e.g. F22, S23, SU23)
 *          - in: path
 *            name: timeslotType
 *            schema:
 *              type: string
 *              required: true
 *              description: The timeslot type (e.g. lectures, tutorials, lecs, tuts)
 *          - in: body
 *            name: timeslot
 *            description: The timeslot to create
 *            schema:
 *              $ref: '#/components/schemas/Timeslot'
 *              required: true
 *                  
 *      responses:
 *          201:
 *              description: The timeslot was created
 *              content:
 *                  application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/Timeslot'
 *          422:
 *              description: Validation error (invalid course code, invalid semester, invalid timeslot properties)
 *          500:
 *              description: Server error
 */

coursesRouter.post('/:code/semesters/:semester/timeslots/:type', passport.authenticate('jwt', {session: false}), async (req, res, next) => {
    const { code, semester, type } = req.params;
    const { group, day, startTime, endTime } = req.body;
    try {
        const timeslot = await timeslotsService.createTimeslot(code, semester, type, group, day, startTime, endTime);
        res.json(timeslot);
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/courses/{courseCode}/prerequisites:
 *  get:
 *      summary: Get the prerequisites of the course with the specified course code
 *      tags: [Courses, Prerequisites]
 *      parameters:
 *          - in: path
 *            name: courseCode
 *      schema:
 *          type: string
 *          required: true
 *          description: The course code
 *      responses:
 *          200:
 *              description: The list of prerequisites
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: array
 *                          items:
 *                              $ref: '#/components/schemas/CourseWithPrerequisites'
 *          404:
 *              description: The course was not found
 *          422:
 *              description: Validation error (invalid course code)
 *          500:
 *              description: Server error
 */

coursesRouter.get('/:code/prerequisites', async (req, res, next) => {
    const code = req.params.code.toUpperCase();
    try {
        const prerequisites = await coursesService.getPrerequisiteCourses(code);
        res.json(prerequisites);
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/courses/{courseCode}/prerequisites:
 *  post:
 *      summary: Add a prerequisite to the course with the specified course code
 *      tags: [Courses, Prerequisites]
 *      security:
 *          - BearerAuth: []
 *      parameters:
 *          - in: path
 *            name: courseCode
 *      schema:
 *          type: string
 *          required: true
 *          description: The course code
 *      requestBody:
 *          description: The prerequisite courses codes to add
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          prerequisiteCodes:
 *                              type: array
 *                              items:
 *                                  type: string
 *                                  description: The prerequisite course codes
 *                      required:
 *                          - prerequisiteCodes
 *      responses:
 *          201:
 *              description: The prerequisite was added
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: array
 *                          items:
 *                              $ref: '#/components/schemas/CourseWithPrerequisites'
 *          401:
 *              description: Unauthorized
 *          404:
 *              description: The course was not found
 *          422:
 *              description: Validation error (invalid course code, invalid prerequisite course code)
 *          500:
 *              description: Server error
 */

coursesRouter.post('/:code/prerequisites', passport.authenticate('jwt', {session: false}), async (req, res, next) => {
    let code = req.params.code.toUpperCase();
    let { prerequisiteCodes } = req.body;
    prerequisiteCodes = prerequisiteCodes.map(code => code.toUpperCase());

    if (!Array.isArray(prerequisiteCodes) || prerequisiteCodes.length === 0) {
        return res.status(422).json({ message: 'Invalid prerequisites: must be an array of at least one course code' });
    }

    try {
        const course = await coursesService.addPrerequisiteCourses(code, prerequisiteCodes);
        res.json(course);
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/courses/{courseCode}/prerequisites/{prerequisiteCode}:
 *  delete:
 *      summary: Remove a prerequisite from the course with the specified course code
 *      tags: [Courses, Prerequisites]
 *      security:
 *          - BearerAuth: []
 *      parameters:
 *          - in: path
 *            name: courseCode
 *            schema:
 *              type: string
 *              required: true
 *              description: The course code
 *          - in: path
 *            name: prerequisiteCode
 *            schema:
 *              type: string
 *              required: true
 *              description: The prerequisite course code
 *      responses:
 *          200:
 *              description: The prerequisite was removed
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: array
 *                          items:
 *                              $ref: '#/components/schemas/Course'
 *          401:
 *              description: Unauthorized
 *          404:
 *              description: The course was not found
 *          422:
 *              description: Validation error (invalid course code, invalid prerequisite course code)
 *          500:
 *              description: Server error
 */

coursesRouter.delete('/:code/prerequisites/:prerequisiteCode', passport.authenticate('jwt', {session: false}), async (req, res, next) => {
    const code = req.params.code.toUpperCase();
    const prerequisiteCode = req.params.prerequisiteCode.toUpperCase();

    try {
        const course = await coursesService.removePrerequisiteCourse(code, prerequisiteCode);
        res.json(course);
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/courses/{courseCode}/prerequisite-hours:
 *  put:
 *      summary: Add or update the prerequisite hours of the course with the specified course code
 *      tags: [Courses, Prerequisites]
 *      security:
 *          - BearerAuth: []
 *      parameters:
 *          - in: path
 *            name: courseCode
 *            schema:
 *              type: string
 *              required: true
 *              description: The course code
 *      requestBody:
 *          description: The prerequisite credit hours to add
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          prerequisiteHours:
 *                              type: number
 *                              description: The prerequisite credit hours
 *                      required:
 *                          - prerequisiteHours
 *      responses:
 *          201:
 *              description: The prerequisite credit hours was added
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: array
 *                          items:
 *                              $ref: '#/components/schemas/Course'
 *          401:
 *              description: Unauthorized
 *          404:
 *              description: The course was not found
 *          422:
 *              description: Validation error (invalid course code, invalid prerequisite credit hours)
 *          500:
 *              description: Server error
 */

coursesRouter.put('/:code/prerequisite-hours', passport.authenticate('jwt', {session: false}), async (req, res, next) => {
    const code = req.params.code.toUpperCase();
    const { prerequisiteHours } = req.body;

    if (typeof prerequisiteHours !== 'number') {
        return res.status(422).json({ message: 'Invalid prerequisite hours: must be a number' });
    }

    try {
        const course = await coursesService.updatePrerequisiteHours(code, prerequisiteHours);
        res.json(course);
    } catch (error) {
        next(error);
    }
});


module.exports = coursesRouter;