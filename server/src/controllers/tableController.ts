import type { Request, Response } from 'express'
import DiningTableModel from '../models/DiningTable.js'
import OrderModel from '../models/Order.js'
import HttpError from '../utils/httpError.js'
import { requireAdmin } from '../utils/roles.js'

export const listTables = async (_req: Request, res: Response) => {
  const tables = await DiningTableModel.find().sort({ code: 1 })
  res.status(200).json(tables)
}

export const createTable = async (req: Request, res: Response) => {
  requireAdmin(req)

  const { code, label } = (req.body ?? {}) as {
    code?: string
    label?: string
  }

  if (!code || !label) {
    throw new HttpError('Table code and label are required', 400)
  }

  const normalizedCode = code.trim().toUpperCase()
  const normalizedLabel = label.trim()

  if (!normalizedCode || !normalizedLabel) {
    throw new HttpError('Table code and label are required', 400)
  }

  const existing = await DiningTableModel.findOne({ code: normalizedCode })

  if (existing) {
    throw new HttpError('Table code already exists', 409)
  }

  const table = await DiningTableModel.create({
    code: normalizedCode,
    label: normalizedLabel,
  })

  res.status(201).json(table)
}

export const updateTable = async (req: Request, res: Response) => {
  requireAdmin(req)

  const { id } = req.params
  const { code, label, active } = (req.body ?? {}) as {
    code?: string
    label?: string
    active?: boolean
  }

  const updatePayload: {
    code?: string
    label?: string
    active?: boolean
  } = {}

  if (code !== undefined) {
    const normalizedCode = code.trim().toUpperCase()
    if (!normalizedCode) {
      throw new HttpError('Table code cannot be empty', 400)
    }

    const existing = await DiningTableModel.findOne({
      _id: { $ne: id },
      code: normalizedCode,
    })

    if (existing) {
      throw new HttpError('Table code already exists', 409)
    }

    updatePayload.code = normalizedCode
  }

  if (label !== undefined) {
    const normalizedLabel = label.trim()
    if (!normalizedLabel) {
      throw new HttpError('Table label cannot be empty', 400)
    }

    updatePayload.label = normalizedLabel
  }

  if (active !== undefined) {
    updatePayload.active = active
  }

  const table = await DiningTableModel.findByIdAndUpdate(id, updatePayload, {
    new: true,
  })

  if (!table) {
    throw new HttpError('Table not found', 404)
  }

  res.status(200).json(table)
}

export const deleteTable = async (req: Request, res: Response) => {
  requireAdmin(req)

  const { id } = req.params
  const table = await DiningTableModel.findById(id)

  if (!table) {
    throw new HttpError('Table not found', 404)
  }

  const linkedOrderCount = await OrderModel.countDocuments({ tableCode: table.code })

  if (linkedOrderCount > 0) {
    throw new HttpError('Cannot delete table that is already used in orders', 409)
  }

  await DiningTableModel.findByIdAndDelete(id)

  res.status(200).json({ message: 'Table deleted successfully' })
}
