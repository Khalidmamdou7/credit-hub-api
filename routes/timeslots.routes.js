const timeslotsRouter = require('express').Router();
const timeslotsService = require('../services/timeslots.service');

// GET /api/timeslots
timeslotsRouter.get('/', async (req, res, next) => {
    try {
        const timeslots = await timeslotsService.getTimeslots();
        res.json(timeslots);
    } catch (err) {
        next(err);
    }
});

// GET /api/timeslots/:id
timeslotsRouter.get('/:id', async (req, res, next) => {
    try {
        const timeslot = await timeslotsService.getTimeslot(req.params.id);
        res.json(timeslot);
    } catch (err) {
        next(err);
    }
});

// POST /api/timeslots
timeslotsRouter.post('/', async (req, res, next) => {
    try {
        const timeslot = await timeslotsService.createTimeslot(req.body);
        res.json(timeslot);
    } catch (err) {
        next(err);
    }
});

// PUT /api/timeslots/:id
timeslotsRouter.put('/:id', async (req, res, next) => {
    try {
        const timeslot = await timeslotsService.updateTimeslot(req.params.id, req.body);
        res.json(timeslot);
    } catch (err) {
        next(err);
    }
});

// DELETE /api/timeslots/:id
timeslotsRouter.delete('/:id', async (req, res, next) => {
    try {
        await timeslotsService.deleteTimeslot(req.params.id);
        res.status(204).end();
    } catch (err) {
        next(err);
    }
});

module.exports = timeslotsRouter;