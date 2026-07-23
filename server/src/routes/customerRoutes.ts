import { Router } from 'express'
import { listCustomerBillingSummaries } from '../controllers/customerController.js'
import asyncHandler from '../utils/asyncHandler.js'

const router = Router()

router.get('/summary', asyncHandler(listCustomerBillingSummaries))

export default router
