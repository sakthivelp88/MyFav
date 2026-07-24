import { Router } from 'express'
import {
  createOrder,
  getLatestCustomerOrder,
  listOrders,
  payForOrder,
  updateCustomerOrder,
  updateOrderBillStatus,
  updateOrderStatus,
} from '../controllers/orderController.js'
import asyncHandler from '../utils/asyncHandler.js'
import { requireAdminCsrf } from '../utils/csrf.js'

const router = Router()

router.post('/', asyncHandler(createOrder))
router.get('/', asyncHandler(listOrders))
router.get('/latest', asyncHandler(getLatestCustomerOrder))
router.patch('/:id', asyncHandler(updateCustomerOrder))
router.post('/:id/pay', asyncHandler(payForOrder))
router.patch('/:id/status', asyncHandler(async (req, res) => {
  requireAdminCsrf(req)
  await updateOrderStatus(req, res)
}))
router.patch('/:id/bill-status', asyncHandler(async (req, res) => {
  requireAdminCsrf(req)
  await updateOrderBillStatus(req, res)
}))

export default router
