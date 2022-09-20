const coursesRouter = require('express').Router();

coursesRouter.get('/', (req, res) => {
    res.send('Getting all courses');
});

coursesRouter.get('/:code', (req, res) => {
    res.send('Gettting course with code ' + req.params.code);
});

coursesRouter.post('/', (req, res) => {
    res.send('Adding a course');
});

coursesRouter.put('/:code', (req, res) => {
    res.send('Updating course with code ' + req.params.code);
});

coursesRouter.delete('/:code', (req, res) => {
    res.send('Deleting course with code ' + req.params.code);
});

module.exports = coursesRouter;