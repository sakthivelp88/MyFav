import type { Request, Response } from 'express'
import CategoryModel from '../models/Category.js'
import ItemModel from '../models/Item.js'
import HttpError from '../utils/httpError.js'
import { requireAdmin } from '../utils/roles.js'

export const listCategories = async (_req: Request, res: Response) => {
  const categories = await CategoryModel.find().sort({ name: 1 })
  res.status(200).json(categories)
}

export const createCategory = async (req: Request, res: Response) => {
  requireAdmin(req)

  const { name } = (req.body ?? {}) as { name?: string }

  if (!name || !name.trim()) {
    throw new HttpError('Category name is required', 400)
  }

  const normalizedName = name.trim()
  const existing = await CategoryModel.findOne({
    name: { $regex: `^${normalizedName}$`, $options: 'i' },
  })

  if (existing) {
    throw new HttpError('Category already exists', 409)
  }

  const category = await CategoryModel.create({
    name: normalizedName,
  })

  res.status(201).json(category)
}

export const updateCategory = async (req: Request, res: Response) => {
  requireAdmin(req)

  const { id } = req.params
  const { name, active } = (req.body ?? {}) as {
    name?: string
    active?: boolean
  }

  if (name !== undefined && !name.trim()) {
    throw new HttpError('Category name cannot be empty', 400)
  }

  const updatePayload: {
    name?: string
    active?: boolean
  } = {}

  if (name !== undefined) {
    const normalizedName = name.trim()
    const existing = await CategoryModel.findOne({
      _id: { $ne: id },
      name: { $regex: `^${normalizedName}$`, $options: 'i' },
    })

    if (existing) {
      throw new HttpError('Category already exists', 409)
    }

    updatePayload.name = normalizedName
  }

  if (active !== undefined) {
    updatePayload.active = active
  }

  const category = await CategoryModel.findByIdAndUpdate(id, updatePayload, {
    new: true,
  })

  if (!category) {
    throw new HttpError('Category not found', 404)
  }

  res.status(200).json(category)
}

export const deleteCategory = async (req: Request, res: Response) => {
  requireAdmin(req)

  const { id } = req.params
  const category = await CategoryModel.findById(id)

  if (!category) {
    throw new HttpError('Category not found', 404)
  }

  const linkedItemCount = await ItemModel.countDocuments({ category: category.name })

  if (linkedItemCount > 0) {
    throw new HttpError('Cannot delete category that is used by menu items', 409)
  }

  await CategoryModel.findByIdAndDelete(id)

  res.status(200).json({ message: 'Category deleted successfully' })
}
