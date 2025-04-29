const express = require('express');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

const { hikVisionEventsHandler } = require('../controllers/hikvisionEventListener');
const { updateEventsHandler } = require('../controllers/updateEventListener');
const { updateEventsOnlyHandler } = require('../controllers/updateEventsOnlyHandler');

router.post('/handle-event', upload.any(), hikVisionEventsHandler);
router.post('/data-update', upload.any(), updateEventsHandler);
router.post('/events-only-update', upload.any(), updateEventsOnlyHandler);

module.exports = router;
