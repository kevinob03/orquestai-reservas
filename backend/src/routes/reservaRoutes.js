const router = require('express').Router(); const c = require('../controllers/reservaController');
router.get('/resumen', c.summary); router.get('/disponibilidad', c.availability); router.route('/reservas').get(c.list).post(c.create); router.get('/reservas/:id', c.get); router.patch('/reservas/:id/estado', c.state);
module.exports = router;
