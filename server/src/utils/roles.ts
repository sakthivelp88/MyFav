import type { Request } from 'express'
import HttpError from './httpError.js'

export type Role = 'admin' | 'customer'

export const requireAdmin = (req: Request) => {
  if (!req.session.admin || req.session.admin.role !== 'admin') {
    throw new HttpError('Admin authentication required', 401)
  }
}
