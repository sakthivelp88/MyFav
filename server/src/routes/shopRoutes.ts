import { Router } from 'express'
import { createShop, getShops } from '../controllers/shopController.js'
import asyncHandler from '../utils/asyncHandler.js'

const router = Router()

router.get('/', asyncHandler(getShops))
router.post('/', asyncHandler(createShop))

export default router
