import { Router } from 'express'
import {
  createTable,
  deleteTable,
  listTables,
  updateTable,
} from '../controllers/tableController.js'
import asyncHandler from '../utils/asyncHandler.js'
import { requireAdminCsrf } from '../utils/csrf.js'

const router = Router()

router.get('/', asyncHandler(listTables))
router.post('/', asyncHandler(async (req, res) => {
  requireAdminCsrf(req)
  await createTable(req, res)
}))
router.patch('/:id', asyncHandler(async (req, res) => {
  requireAdminCsrf(req)
  await updateTable(req, res)
}))
router.delete('/:id', asyncHandler(async (req, res) => {
  requireAdminCsrf(req)
  await deleteTable(req, res)
}))

export default router
