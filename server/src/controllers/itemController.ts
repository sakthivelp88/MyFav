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

  const { name, price, category, available } = req.body as {
    name?: string
    price?: number
    category?: string
    available?: boolean
  }

  if (!name || typeof price !== 'number') {
    throw new HttpError('name and numeric price are required', 400)
  }

  const item = await ItemModel.create({
    name,
    price,
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
