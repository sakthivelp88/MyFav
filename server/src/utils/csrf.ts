import crypto from 'node:crypto'
import type { Request } from 'express'
import HttpError from './httpError.js'

const CSRF_HEADER = 'x-csrf-token'

export const generateCsrfToken = () => crypto.randomBytes(32).toString('hex')

export const requireAdminCsrf = (req: Request) => {
  if (!req.session.admin || req.session.admin.role !== 'admin') {
    throw new HttpError('Admin authentication required', 401)
  }

  const requestToken = req.header(CSRF_HEADER)
  const sessionToken = req.session.csrfToken

  if (!requestToken || !sessionToken || requestToken !== sessionToken) {
    throw new HttpError('Invalid CSRF token', 403)
  }
}
