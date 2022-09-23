const coursesRouter = require('express').Router();
const coursesService = require('../services/courses.services');
const timeslotsService = require('../services/timeslots.services');

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

coursesRouter.get('/:code/semesters/:semester/timeslots', async (req, res, next) => {
    const { code, semester } = req.params;
    try {
        const timeslots = await timeslotsService.getTimeslotsByCourseAndSemester(code, semester);
        res.json(timeslots);
    } catch (error) {
        next(error);
    }
});

coursesRouter.post('/:code/semesters/:semester/timeslots/:type', async (req, res, next) => {
    const { code, semester, type } = req.params;
    const { group, day, startTime, endTime } = req.body;
    try {
        const timeslot = await timeslotsService.createTimeslot(code, semester, type, group, day, startTime, endTime);
        res.json(timeslot);
    } catch (error) {
        next(error);
    }
});


module.exports = coursesRouter;