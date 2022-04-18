
var express = require('express');
var router = express.Router();
const knex = require('../database/client');

////////////////////////////////////////////////////////////////////////////////
// Database calls - START
////////////////////////////////////////////////////////////////////////////////

function getLunchWeekList() {
    return knex.select().from('lunch_week').orderBy('week_of');
}

function getLunchWeekById(id) {
    return knex.select().from('lunch_week').where('lunch_week_id', id).first();
}

function createLunchWeek(lunchWeek) {
    // for Postgres, we need to specifiy what columns to return back
    // from the insert statement with a call to `.returning()`
    return knex('lunch_week').insert(lunchWeek).returning('lunch_week_id');
}

function updateLunchWeek(id, lunchWeek) {
    return knex('lunch_week').where('lunch_week_id', id).update(lunchWeek);
}

function deleteLunchWeek(lunchWeekId) {
    return knex('lunch_week').where('lunch_week_id', lunchWeekId).del();
}

const getLunchDayList = (lunchWeekId) => {
    return knex.select().from('lunch_day').where('lunch_week_id', lunchWeekId)
}

function getLunchDayById(id) {
    return knex.select().from('lunch_day').where('lunch_day_id', id).first();
}

function createLunchDay(lunchDay) {
    return knex('lunch_day').insert(lunchDay).returning('lunch_day_id');
}

function updateLunchDay(id, lunchDay) {
    return knex('lunch_day').where('lunch_day_id', id).update(lunchDay);
}

function deleteLunchDay(lunchDayId) {
    return knex('lunch_day').where('lunch_day_id', lunchDayId).del();
}


////////////////////////////////////////////////////////////////////////////////
// Database calls - END

////////////////////////////////////////////////////////////////////////////////


// Get all lunch weeks
router.get('/', async function (req, res) {
    try {
        const lunchWeekList = await getLunchWeekList();
        res.send(lunchWeekList);
    } catch (e) {
        const message = `Error getting Lunch Week List`;
        res.status(500).send({ message: message, error: e.toString() });
    }
});

// Get one lunch week by id
router.get('/:lunchWeekId', async function (req, res) {
    try {
        const id = parseInt(req.params.lunchWeekId);
        const lunchWeek = await getLunchWeekById(id);
        if (lunchWeek) {
            let lunchDays = await getLunchDayList(id); // get all lunch days in this week
            lunchWeek.lunchDays = lunchDays; // add lunchDays to lunchWeek
            res.send(lunchWeek);
        } else {
            const message = `Lunch Week Id ${req.params.lunchWeekId} not found`;
            res.status(404).send({
                message: message,
            });
        }
    } catch (e) {
        const message = `Error getting Lunch Week Id ${req.params.lunchWeekId}`;
        res.status(500).send({
            message: message,
            error: e.toString()
        });
    }
});

// Create a new lunch week
router.post('/', async function (req, res) {
    const lunchWeek = req.body
    try {
        const insertResponse = await createLunchWeek(lunchWeek)
        // Since you can insert more than one row with `knex.insert`, the response is
        // an array, so we need to return the 0 position
        const insertedLunchWeekId = insertResponse[0];
        const response = {
            lunchWeekId: insertedLunchWeekId,
        };
        res.send(response);
    } catch (e) {
        const message = `Error creating Lunch Week`;
        res.status(500).send({ message: message, error: e.toString() });
    }
})

// Update a lunch week
router.put('/:lunchWeekId', async function (req, res) {
    try {
        const id = parseInt(req.params.lunchWeekId);
        const lunchWeek = req.body;

        if (id !== lunchWeek.lunchWeekId) {
            const message = `Bad request, IDs do not match`;
            res.status(400).send({ message: message });
            // IMPORTANT, we need to explicitly return here, otherwise the rest
            // of the endpoint code will continue to run.
            // In other words, res.send does not return like you might think it would
            return;
        }

        await updateLunchWeek(id, lunchWeek);
        res.send();
    } catch (e) {
        const message = `Error updating Lunch Week`;
        res.status(500).send({ message: message, error: e.toString() });
    }
})

// Delete a lunch week
router.delete('/:lunchWeekId', async function (req, res) {
    try {
        const id = parseInt(req.params.lunchWeekId)
        await deleteLunchWeek(id)
        res.send()
    } catch (e) {
        const message = `Error deleting Lunch Week`
        res.status(500).send({ message: message, error: e.toString() })
    }
})

// Get one lunch day by id
router.get('/:lunchWeekId/lunch-days/:lunchDayId', async function (req, res) {
    try {
        const id = parseInt(req.params.lunchDayId);
        const lunchDay = await getLunchDayById(id);
        if (lunchDay) {
            res.send(lunchDay);
        } else {
            const message = `Lunch Day Id ${req.params.lunchDayId} not found`;
            res.status(404).send({
                message: message,
            });
        }
    } catch (e) {
        const message = `Error getting Lunch Day Id ${req.params.lunchDayId}`;
        res.status(500).send({
            message: message,
            error: e.toString()
        });
    }
});
// Create a new lunch day
router.post('/:lunchWeekId/lunch-days/', async function (req, res) {
    const lunchDay = req.body
    try {
        const insertResponse = await createLunchDay(lunchDay)
        const insertedLunchDayId = insertResponse[0]
        const response = {
            lunchDayId: insertedLunchDayId,
        }
        res.send(response)
    } catch (e) {
        const message = `Error creating Lunch Day`
        res.status(500).send({ message: message, error: e.toString() })
    }
})

// Update a lunch day
router.put('/:lunchWeekId/lunch-days/:lunchDayId', async function (req, res) {
    try {
        const id = parseInt(req.params.lunchDayId);
        const lunchDay = req.body;

        if (id !== lunchDay.lunchDayId) {
            const message = `Bad request, IDs do not match`;
            res.status(400).send({ message: message });
            // IMPORTANT, we need to explicitly return here, otherwise the rest
            // of the endpoint code will continue to run.
            // In other words, res.send does not return like you might think it would
            return;
        }

        await updateLunchDay(id, lunchDay);
        res.send();
    } catch (e) {
        const message = `Error updating Lunch Day`;
        res.status(500).send({ message: message, error: e.toString() });
    }
})

// Delete a lunch day
router.delete('/:lunchWeekId/lunch-days/:lunchDayId', async function (req, res) {
    try {
        const id = parseInt(req.params.lunchDayId)
        await deleteLunchDay(id)
        res.send()
    } catch (e) {
        const message = `Error deleting Lunch Day`
        res.status(500).send({ message: message, error: e.toString() })
    }
})

module.exports = router;
