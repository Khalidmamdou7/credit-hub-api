const coursesRouter = require('express').Router();
const coursesService = require('../services/courses.services');

coursesRouter.get('/', async (req, res) => {
    try {
        const courses = await coursesService.getAllCourses();
        res.json(courses);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

coursesRouter.get('/:code', async (req, res) => {
    try {
        const course = await coursesService.getCourse(req.params.code);
        res.json(course);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

coursesRouter.post('/', async (req, res) => {
    try {
        const course = await coursesService.createCourse(req.body.code, req.body.name);
        res.json(course);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

coursesRouter.put('/:code', async (req, res) => {
    try {
        const course = await coursesService.updateCourse(req.params.code, req.body.name);
        res.json(course);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

coursesRouter.delete('/:code', async (req, res) => {
    try {
        await coursesService.deleteCourse(req.params.code);
        res.sendStatus(204);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = coursesRouter;