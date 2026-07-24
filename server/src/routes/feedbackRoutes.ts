import { Router } from 'express'
import {
  createFeedback,
  listFeedback,
  updateFeedbackStatus,
} from '../controllers/feedbackController.js'
import asyncHandler from '../utils/asyncHandler.js'
import { requireAdminCsrf } from '../utils/csrf.js'

const router = Router()

router.post('/', asyncHandler(createFeedback))
router.get('/', asyncHandler(listFeedback))
router.patch('/:id/status', asyncHandler(async (req, res) => {
  requireAdminCsrf(req)
  await updateFeedbackStatus(req, res)
}))

export default router
