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
    const { name } = req.body;
    const code = req.body.code.toUpperCase();
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

// search for courses by name or code
coursesRouter.get('/search/:query', async (req, res, next) => {
    let query = req.params.query;
    try {
        const courses = await coursesService.searchCourses(query);
        res.json(courses);
    } catch (error) {
        next(error);
    }
});


module.exports = coursesRouter;