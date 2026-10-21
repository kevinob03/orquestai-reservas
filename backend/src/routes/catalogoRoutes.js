const router = require('express').Router();
const c = require('../controllers/catalogoController');

for (const resource of ['mesas', 'clientes']) {
  router.route(`/${resource}`).get(c.list(resource)).post(c.create(resource));
  router.route(`/${resource}/:id`).get(c.get(resource)).put(c.update(resource)).delete(c.remove(resource));
}
module.exports = router;
