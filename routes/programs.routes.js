const programsRouter = require('express').Router()
const programsService = require('../services/programs.services')


/**
 * @swagger
 * components:
 *  schemas:
 *      Program:
 *          type: object
 *          required:
 *              - code
 *              - name
 *          properties:
 *              code:
 *                  type: string
 *                  description: The program code
 *              name:
 *                  type: string
 *                  description: The program name
 *          example:
 *              code: "CCE"
 *              name: "Communication and Computer Engineering"
 */

/**
 * @swagger
 * /api/programs:
 *  get:
 *      summary: Get all programs
 *      tags:
 *          - Programs
 *      responses:
 *          200:
 *              description: Array of programs
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: array
 *                          items:
 *                              $ref: '#/components/schemas/Program'
 */
programsRouter.get('/', async (req, res, next) => {
    try {
        const programs = await programsService.getAllPrograms()
        res.json(programs)
    } catch (error) {
        next(error)
    }
})

/**
 * @swagger
 * /api/programs/{code}:
 *  get:
 *      summary: Get a program by code
 *      tags:
 *          - Programs
 *      parameters:
 *          - in: path
 *            name: code
 *      schema:
 *          type: string
 *          required: true
 *          description: The program code
 *      responses:
 *          200:
 *              description: The program
 *              content:
 *                  application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/Program'
 */

programsRouter.get('/:code', async (req, res, next) => {
    try {
        const program = await programsService.getProgram(req.params.code)
        res.json(program)
    } catch (error) {
        next(error)
    }
})

/**
 * @swagger
 * /api/programs:
 *  post:
 *      summary: Create a program
 *      tags:
 *          - Programs
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      $ref: '#/components/schemas/Program'
 *      responses:
 *          200:
 *              description: The program
 *              content:
 *                  application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/Program'
 */

programsRouter.post('/', async (req, res, next) => {
    try {
        const program = await programsService.addProgram(req.body.code, req.body.name)
        res.status(201).json(program)
    } catch (error) {
        next(error)
    }
})


/**
 * @swagger
 * /api/programs/{code}:
 *  put:
 *      summary: Update a program
 *      tags:
 *          - Programs
 *      parameters:
 *          - in: path
 *            name: code
 *      schema:
 *          type: string
 *          required: true
 *          description: The program code
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      $ref: '#/components/schemas/Program'
 *      responses:
 *          200:
 *              description: The program
 *              content:
 *                  application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/Program'
 */

programsRouter.put('/:code', async (req, res, next) => {
    try {
        const program = await programsService.updateProgram(req.params.code, req.body.code, req.body.name)
        res.json(program)
    } catch (error) {
        next(error)
    }
})

/**
 * @swagger
 * /api/programs/{code}:
 *  delete:
 *      summary: Delete a program
 *      tags:
 *          - Programs
 *      parameters:
 *          - in: path
 *            name: code
 *      schema:
 *          type: string
 *          required: true
 *          description: The program code
 */

programsRouter.delete('/:code', async (req, res, next) => {
    try {
        await programsService.deleteProgram(req.params.code)
        res.status(204).end()
    } catch (error) {
        next(error)
    }
})  

/**
 * @swagger
 * /api/programs/{code}/courses:
 *  post:
 *      summary: Add a course to a program
 *      tags:
 *          - Programs
 *      parameters:
 *          - in: path
 *            name: code
 *      schema:
 *          type: string
 *          required: true
 *          description: The program code
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          courseCode:
 *                              type: string
 *                          courseGroup:
 *                              type: string
 *                              description: The course group (e.g. "university-requirements", "college-requirements", "program-requirements", "elective-group-1", "elective-group-2", "elective-group-3", "elective-group-4", "elective-group-5", "elective-group-6", "elective-group-7", "elective-group-8", "elective-group-9", "elective-group-10")
 *                      required:
 *                          - courseCode
 *                          - courseGroup
 *      responses:
 *          200:
 *              description: The course added to the program
 *              content:
 *                  application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/Course'
 */

programsRouter.post('/:code/courses', async (req, res, next) => {
    let programCode = req.params.code
    let { courseCode, courseGroup } = req.body

    try {
        const course = await programsService.addCourseToProgram(programCode, courseCode, courseGroup)
        res.status(201).json(course)
    } catch (error) {
        next(error)
    }
})

/**
 * @swagger
 * /api/programs/{code}/courses:
 *  delete:
 *      summary: Remove a course from a program
 *      tags:
 *          - Programs
 *      parameters:
 *          - in: path
 *            name: code
 *      schema:
 *          type: string
 *          required: true
 *          description: The program code
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          courseCode:
 *                              type: string
 *                      required:
 *                          - courseCode
 *      responses:
 *          204:
 *              description: The course removed from the program
 *              content:
 *                  application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/Course'
 */

programsRouter.delete('/:code/courses', async (req, res, next) => {
    try {
        await programsService.removeCourseFromProgram(req.params.code, req.body.courseCode)
        res.status(204).end()
    } catch (error) {
        next(error)
    }
})

/**
 * @swagger
 * /api/programs/{programCode}/courses/{courseCode}:
 *  put:
 *      summary: Update a course group in a program
 *      tags:
 *          - Programs
 *      parameters:
 *          - in: path
 *            name: programCode
 *          - in: path
 *            name: courseCode
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          courseGroup:
 *                              type: string
 *                              description: The course group (e.g. "university-requirements", "college-requirements", "program-requirements", "elective-group-1", "elective-group-2")
 *                      required:
 *                          - courseGroup
 *      responses:
 *          200:
 *              description: The course group updated
 *              content:
 *                  application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/Course'
 *          404:
 *              description: The course or program does not exist 
 *          422:
 *              description: One or more fields are invalid
 */

programsRouter.put('/:programCode/courses/:courseCode', async (req, res, next) => {
    const { programCode, courseCode } = req.params
    const { courseGroup } = req.body

    if (!programCode || !courseCode || !courseGroup) {
        return res.status(422).json({ error: 'Missing required fields' })
    }
    try {
        const course = await programsService.updateCourseGroupInProgram(programCode, courseCode, courseGroup)
        res.json(course)
    } catch (error) {
        next(error)
    }
})

/**
 * @swagger
 * /api/programs/{code}/courses:
 *  get:
 *      summary: Get all courses in a program
 *      tags:
 *          - Programs
 *      parameters:
 *          - in: path
 *            name: code
 *      schema:
 *          type: string
 *          required: true
 *          description: The program code
 *      responses:
 *          200:
 *              description: Array of courses
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: array
 *                          items:
 *                              $ref: '#/components/schemas/Course'
 */

programsRouter.get('/:code/courses', async (req, res, next) => {
    try {
        const courses = await programsService.getProgramCourses(req.params.code)
        res.json(courses)
    } catch (error) {
        next(error)
    }
})

module.exports = programsRouter
