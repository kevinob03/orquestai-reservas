const service = require('../services/catalogoService');
const { asyncHandler } = require('../utils');

exports.list = (resource) => asyncHandler(async (req, res) => res.json(await service.list(resource, req.query.q || '')));
exports.get = (resource) => asyncHandler(async (req, res) => res.json(await service.get(resource, req.params.id)));
exports.create = (resource) => asyncHandler(async (req, res) => res.status(201).json(await service.create(resource, req.body)));
exports.update = (resource) => asyncHandler(async (req, res) => res.json(await service.update(resource, req.params.id, req.body)));
exports.remove = (resource) => asyncHandler(async (req, res) => { await service.remove(resource, req.params.id); res.status(204).send(); });
