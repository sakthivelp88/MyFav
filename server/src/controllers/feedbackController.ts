import type { Request, Response } from 'express'
import FeedbackModel from '../models/Feedback.js'
import HttpError from '../utils/httpError.js'
import { requireAdmin } from '../utils/roles.js'

export const createFeedback = async (req: Request, res: Response) => {
  const { customerName, customerPhone, message } = req.body as {
    customerName?: string
    customerPhone?: string
    message?: string
  }

  if (!customerName?.trim() || !customerPhone?.trim() || !message?.trim()) {
    throw new HttpError('customerName, customerPhone and message are required', 400)
  }

  const feedback = await FeedbackModel.create({
    customerName: customerName.trim(),
    customerPhone: customerPhone.trim(),
    message: message.trim(),
    status: 'new',
  })

  res.status(201).json(feedback)
}

export const listFeedback = async (req: Request, res: Response) => {
  requireAdmin(req)

  const feedback = await FeedbackModel.find().sort({ createdAt: -1 })
  res.status(200).json(feedback)
}

export const updateFeedbackStatus = async (req: Request, res: Response) => {
  requireAdmin(req)

  const { id } = req.params
  const { status } = req.body as {
    status?: 'new' | 'reviewed' | 'resolved'
  }

  if (!status || !['new', 'reviewed', 'resolved'].includes(status)) {
    throw new HttpError('Invalid feedback status', 400)
  }

  const feedback = await FeedbackModel.findByIdAndUpdate(id, { status }, { new: true })

  if (!feedback) {
    throw new HttpError('Feedback not found', 404)
  }

  res.status(200).json(feedback)
}
