import { Router } from 'express'
import {
  createOrder,
  getGstSetting,
  getLatestCustomerOrder,
  listOrders,
  payForOrder,
  updateGstSetting,
  updateCustomerOrder,
  updateOrderBillStatus,
  updateOrderStatus,
  setPreparationTime,
  getOrdersForAutoTransition,
  autoTransitionOrderStatus,
  getPendingOrders,
} from '../controllers/orderController.js'
import asyncHandler from '../utils/asyncHandler.js'
import { requireAdminCsrf } from '../utils/csrf.js'

const router = Router()

router.post('/', asyncHandler(createOrder))
router.get('/', asyncHandler(listOrders))
router.get('/gst', asyncHandler(getGstSetting))
router.patch('/gst', asyncHandler(async (req, res) => {
  requireAdminCsrf(req)
  await updateGstSetting(req, res)
}))
router.get('/latest', asyncHandler(getLatestCustomerOrder))
router.get('/pending/all', asyncHandler(getPendingOrders))
router.get('/auto-transition/check', asyncHandler(getOrdersForAutoTransition))
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
router.post('/:id/set-prep-time', asyncHandler(async (req, res) => {
  requireAdminCsrf(req)
  await setPreparationTime(req, res)
}))
router.patch('/:id/auto-transition', asyncHandler(async (req, res) => {
  requireAdminCsrf(req)
  await autoTransitionOrderStatus(req, res)
}))

export default router
