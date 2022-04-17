
var express = require('express');
var router = express.Router();

const lunchWeekList = [
    {
        lunchWeekId: 1,
        weekOf: '2020-10-05',
        isPublished: true,
    },
    {
        lunchWeekId: 2,
        weekOf: '2020-10-12',
        isPublished: true,
    },
    {
        lunchWeekId: 3,
        weekOf: '2020-10-19',
        isPublished: false,
    },
]

/* GET lunchWeek listing. */
router.get('/', function (req, res) {
    res.send(lunchWeekList);
})

/* GET lunchWeek */
router.get('/:lunchWeekId', function (req, res) {
    const lunchWeekId = parseInt(req.params.lunchWeekId);
    const lunchWeek = lunchWeekList.find(lunchWeek => lunchWeek.lunchWeekId === lunchWeekId);
    if (!lunchWeek) {
        res.send(lunchWeekList);
    }
    else {
        res.status(404).send();
    }
})

module.exports = router;
