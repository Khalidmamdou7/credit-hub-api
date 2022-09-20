const coursesRouter = require('express').Router();
const coursesService = require('../services/courses.services');

coursesRouter.get('/', async (req, res, next) => {
    try {
        const courses = await coursesService.getAllCourses();
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

coursesRouter.post('/', async (req, res, next) => {
    const { code, name } = req.body;
    code = code.toUpperCase();
    try {
        const course = await coursesService.createCourse(code, name);
        res.json(course);
    } catch (error) {
        next(error);
    }
});

coursesRouter.put('/:code', async (req, res, next) => {
    const code = req.params.code.toUpperCase();
    const { name } = req.body;
    try {
        const course = await coursesService.updateCourse(code, name);
        res.json(course);
    } catch (error) {
        next(error);
    }
});

coursesRouter.delete('/:code', async (req, res, next) => {
    const code = req.params.code.toUpperCase();
    try {
        await coursesService.deleteCourse(code);
        res.sendStatus(204);
    } catch (error) {
        next(error);
    }
});

module.exports = coursesRouter;