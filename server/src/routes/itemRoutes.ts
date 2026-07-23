import { Router } from 'express'
import {
  createItem,
  listItems,
  updateItemAvailability,
} from '../controllers/itemController.js'
import asyncHandler from '../utils/asyncHandler.js'
import { requireAdminCsrf } from '../utils/csrf.js'

const router = Router()

router.get('/', asyncHandler(listItems))
router.post('/', asyncHandler(async (req, res) => {
  requireAdminCsrf(req)
  await createItem(req, res)
}))
router.patch('/:id/availability', asyncHandler(async (req, res) => {
  requireAdminCsrf(req)
  await updateItemAvailability(req, res)
}))

export default router
