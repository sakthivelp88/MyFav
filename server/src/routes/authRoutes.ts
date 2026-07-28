import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import {
	adminChangePassword,
	adminForgotPassword,
	adminLogin,
	adminLogout,
	adminMe,
} from '../controllers/authController.js'
import asyncHandler from '../utils/asyncHandler.js'
import { requireAdminCsrf } from '../utils/csrf.js'

const router = Router()

const adminLoginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 10,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		message: 'Too many login attempts. Try again in 15 minutes.',
	},
})

router.post('/admin/login', adminLoginLimiter, asyncHandler(adminLogin))
router.post('/admin/forgot-password', adminLoginLimiter, asyncHandler(adminForgotPassword))
router.get('/admin/me', asyncHandler(adminMe))
router.post('/admin/logout', asyncHandler(async (req, res) => {
	requireAdminCsrf(req)
	await adminLogout(req, res)
}))
router.post('/admin/change-password', asyncHandler(async (req, res) => {
	requireAdminCsrf(req)
	await adminChangePassword(req, res)
}))

export default router
