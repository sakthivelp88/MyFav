import { Router } from 'express'
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '../controllers/categoryController.js'
import asyncHandler from '../utils/asyncHandler.js'
import { requireAdminCsrf } from '../utils/csrf.js'

const router = Router()

router.get('/', asyncHandler(listCategories))
router.post('/', asyncHandler(async (req, res) => {
  requireAdminCsrf(req)
  await createCategory(req, res)
}))
router.patch('/:id', asyncHandler(async (req, res) => {
  requireAdminCsrf(req)
  await updateCategory(req, res)
}))
router.delete('/:id', asyncHandler(async (req, res) => {
  requireAdminCsrf(req)
  await deleteCategory(req, res)
}))

export default router
