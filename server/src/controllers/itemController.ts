import type { Request, Response } from 'express'
import ItemModel from '../models/Item.js'
import { requireAdmin } from '../utils/roles.js'
import HttpError from '../utils/httpError.js'

export const listItems = async (_req: Request, res: Response) => {
  const items = await ItemModel.find().sort({ createdAt: -1 })
  res.status(200).json(items)
}

export const createItem = async (req: Request, res: Response) => {
  requireAdmin(req)

  const { name, price, category, available, stockQuantity, stockUnit, weightage, gstRate } = req.body as {
    name?: string
    price?: number
    category?: string
    available?: boolean
    stockQuantity?: number
    stockUnit?: 'kg' | 'gram' | 'numbers' | 'litre'
    weightage?: string
    gstRate?: number
  }

  const validUnits = ['kg', 'gram', 'numbers', 'litre']

  if (!name || typeof price !== 'number' || typeof stockQuantity !== 'number' || !weightage?.trim()) {
    throw new HttpError('name, numeric quantity, weightage and numeric price are required', 400)
  }

  const parsedGstRate = Number(gstRate)
  if (!Number.isFinite(parsedGstRate) || parsedGstRate < 0 || ![0, 5, 18].includes(parsedGstRate)) {
    throw new HttpError('gstRate must be one of 0, 5, or 18', 400)
  }

  if (!stockUnit || !validUnits.includes(stockUnit)) {
    throw new HttpError('Valid stock unit is required', 400)
  }

  const item = await ItemModel.create({
    name,
    stockQuantity,
    stockUnit,
    weightage: weightage.trim(),
    price,
    gstRate: parsedGstRate,
    category: category ?? 'tea',
    available: available ?? true,
  })

  res.status(201).json(item)
}

export const updateItemAvailability = async (req: Request, res: Response) => {
  requireAdmin(req)

  const { id } = req.params
  const { available } = req.body as { available?: boolean }

  if (typeof available !== 'boolean') {
    throw new HttpError('available must be boolean', 400)
  }

  const item = await ItemModel.findByIdAndUpdate(
    id,
    { available },
    { new: true }
  )

  if (!item) {
    throw new HttpError('Item not found', 404)
  }

  res.status(200).json(item)
}

export const updateItemInventory = async (req: Request, res: Response) => {
  requireAdmin(req)

  const { id } = req.params
  const { name, stockQuantity, stockUnit, weightage, price, category, available, gstRate } = req.body as {
    name?: string
    stockQuantity?: number
    stockUnit?: 'kg' | 'gram' | 'numbers' | 'litre'
    weightage?: string
    price?: number
    category?: string
    available?: boolean
    gstRate?: number
  }

  const validUnits = ['kg', 'gram', 'numbers', 'litre']

  if (!name?.trim() || typeof stockQuantity !== 'number' || stockQuantity < 0 || !weightage?.trim() || typeof price !== 'number' || price < 0) {
    throw new HttpError('name, numeric quantity, weightage and numeric price are required', 400)
  }

  if (!stockUnit || !validUnits.includes(stockUnit)) {
    throw new HttpError('Valid stock unit is required', 400)
  }

  const parsedGstRate = Number(gstRate)
  if (!Number.isFinite(parsedGstRate) || parsedGstRate < 0 || ![0, 5, 18].includes(parsedGstRate)) {
    throw new HttpError('gstRate must be one of 0, 5, or 18', 400)
  }

  const item = await ItemModel.findByIdAndUpdate(
    id,
    {
      name: name.trim(),
      stockQuantity,
      stockUnit,
      weightage: weightage.trim(),
      price,
      gstRate: parsedGstRate,
      category: category?.trim() || 'tea',
      available: typeof available === 'boolean' ? available : stockQuantity > 0,
    },
    { new: true }
  )

  if (!item) {
    throw new HttpError('Item not found', 404)
  }

  res.status(200).json(item)
}
