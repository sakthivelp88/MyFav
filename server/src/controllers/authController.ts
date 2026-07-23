import type { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import HttpError from '../utils/httpError.js'
import AdminUserModel from '../models/AdminUser.js'
import { generateCsrfToken } from '../utils/csrf.js'

export const adminLogin = async (req: Request, res: Response) => {
  const { username, password } = req.body as {
    username?: string
    password?: string
  }

  if (!username || !password) {
    throw new HttpError('username and password are required', 400)
  }

  const adminUser = await AdminUserModel.findOne({ username })

  if (!adminUser || !adminUser.active) {
    throw new HttpError('Invalid admin credentials', 401)
  }

  const passwordMatches = await bcrypt.compare(password, adminUser.passwordHash)

  if (!passwordMatches) {
    throw new HttpError('Invalid admin credentials', 401)
  }

  req.session.admin = {
    username: adminUser.username,
    role: 'admin',
  }
  req.session.csrfToken = generateCsrfToken()

  await new Promise<void>((resolve, reject) => {
    req.session.save((error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })

  res.status(200).json({
    admin: {
      username: adminUser.username,
      role: 'admin',
    },
    csrfToken: req.session.csrfToken,
  })
}

export const adminMe = async (req: Request, res: Response) => {
  if (!req.session.admin) {
    res.status(200).json({
      authenticated: false,
    })
    return
  }

  res.status(200).json({
    authenticated: true,
    admin: req.session.admin,
    csrfToken: req.session.csrfToken,
  })
}

export const adminLogout = async (req: Request, res: Response) => {
  req.session.csrfToken = undefined

  await new Promise<void>((resolve, reject) => {
    req.session.destroy((error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })

  res.clearCookie('shopqr.sid')
  res.status(200).json({ message: 'Logged out successfully' })
}

export const adminChangePassword = async (req: Request, res: Response) => {
  if (!req.session.admin) {
    throw new HttpError('Admin authentication required', 401)
  }

  const { currentPassword, newPassword } = (req.body ?? {}) as {
    currentPassword?: string
    newPassword?: string
  }

  if (!currentPassword || !newPassword) {
    throw new HttpError('currentPassword and newPassword are required', 400)
  }

  if (newPassword.length < 8) {
    throw new HttpError('New password must be at least 8 characters', 400)
  }

  const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/

  if (!strongPasswordPattern.test(newPassword)) {
    throw new HttpError(
      'New password must include upper, lower, number, and special character',
      400
    )
  }

  const adminUser = await AdminUserModel.findOne({
    username: req.session.admin.username,
  })

  if (!adminUser || !adminUser.active) {
    throw new HttpError('Admin account not found', 404)
  }

  const passwordMatches = await bcrypt.compare(currentPassword, adminUser.passwordHash)

  if (!passwordMatches) {
    throw new HttpError('Current password is incorrect', 401)
  }

  if (currentPassword === newPassword) {
    throw new HttpError('New password must be different from current password', 400)
  }

  const nextPasswordHash = await bcrypt.hash(newPassword, 12)
  adminUser.passwordHash = nextPasswordHash
  await adminUser.save()

  req.session.csrfToken = generateCsrfToken()

  res.status(200).json({
    message: 'Password changed successfully',
    csrfToken: req.session.csrfToken,
  })
}
