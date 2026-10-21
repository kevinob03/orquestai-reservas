const service = require('../services/reservaService');
const { asyncHandler } = require('../utils');
exports.list = asyncHandler(async (req,res) => res.json(await service.list(req.query)));
exports.get = asyncHandler(async (req,res) => res.json(await service.get(req.params.id)));
exports.create = asyncHandler(async (req,res) => res.status(201).json(await service.create(req.body)));
exports.state = asyncHandler(async (req,res) => res.json(await service.updateState(req.params.id, req.body.estado)));
exports.summary = asyncHandler(async (_req,res) => res.json(await service.summary()));
exports.availability = asyncHandler(async (req,res) => res.json(await service.availability(req.query)));
