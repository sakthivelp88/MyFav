import type { Request, Response } from 'express'
import CustomerModel from '../models/Customer.js'
import ItemModel from '../models/Item.js'
import OrderModel from '../models/Order.js'
import HttpError from '../utils/httpError.js'
import { requireAdmin } from '../utils/roles.js'

type CreateOrderItem = {
  itemId: string
  quantity: number
}

const buildInvoiceNumber = () => {
  const now = new Date()
  const yyyy = String(now.getFullYear())
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const random = Math.floor(1000 + Math.random() * 9000)

  return `INV-${yyyy}${mm}${dd}-${random}`
}

export const createOrder = async (req: Request, res: Response) => {
  const { customerName, customerPhone, tableCode, items } = req.body as {
    customerName?: string
    customerPhone?: string
    tableCode?: string
    items?: CreateOrderItem[]
  }

  if (!customerName || !customerPhone || !tableCode) {
    throw new HttpError('customerName, customerPhone and tableCode are required', 400)
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new HttpError('At least one item is required', 400)
  }

  const itemIds = items.map((entry) => entry.itemId)
  const dbItems = await ItemModel.find({ _id: { $in: itemIds }, available: true })

  if (dbItems.length !== itemIds.length) {
    throw new HttpError('One or more selected items are unavailable', 400)
  }

  const normalizedItems = items.map((entry) => {
    const item = dbItems.find((dbItem) => dbItem.id === entry.itemId)

    if (!item) {
      throw new HttpError('Invalid item selected', 400)
    }

    if (!Number.isInteger(entry.quantity) || entry.quantity < 1) {
      throw new HttpError('Quantity must be a positive integer', 400)
    }

    return {
      itemId: item._id,
      name: item.name,
      price: item.price,
      quantity: entry.quantity,
      lineTotal: item.price * entry.quantity,
    }
  })

  const totalAmount = normalizedItems.reduce((sum, current) => sum + current.lineTotal, 0)

  const order = await OrderModel.create({
    customerName,
    customerPhone,
    tableCode,
    items: normalizedItems,
    totalAmount,
    invoiceNumber: buildInvoiceNumber(),
    status: 'pending',
    billStatus: 'unpaid',
  })

  await CustomerModel.findOneAndUpdate(
    { phone: customerPhone.trim() },
    {
      $set: {
        name: customerName.trim(),
        lastTableCode: tableCode.trim().toUpperCase(),
        lastOrderedAt: order.createdAt,
      },
      $inc: {
        totalOrders: 1,
        totalSpent: totalAmount,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  )

  res.status(201).json(order)
}

export const listOrders = async (req: Request, res: Response) => {
  requireAdmin(req)

  const { from, to } = req.query as {
    from?: string
    to?: string
  }

  const createdAtFilter: {
    $gte?: Date
    $lte?: Date
  } = {}

  if (from) {
    const fromDate = new Date(from)
    if (!Number.isNaN(fromDate.getTime())) {
      createdAtFilter.$gte = fromDate
    }
  }

  if (to) {
    const toDate = new Date(to)
    if (!Number.isNaN(toDate.getTime())) {
      toDate.setHours(23, 59, 59, 999)
      createdAtFilter.$lte = toDate
    }
  }

  const query = Object.keys(createdAtFilter).length > 0 ? { createdAt: createdAtFilter } : {}

  const orders = await OrderModel.find(query).sort({ createdAt: -1 })
  res.status(200).json(orders)
}

export const getLatestCustomerOrder = async (req: Request, res: Response) => {
  const { customerPhone, tableCode } = req.query as {
    customerPhone?: string
    tableCode?: string
  }

  if (!customerPhone || !tableCode) {
    throw new HttpError('customerPhone and tableCode are required', 400)
  }

  const order = await OrderModel.findOne({
    customerPhone: customerPhone.trim(),
    tableCode: tableCode.trim().toUpperCase(),
  }).sort({ createdAt: -1 })

  if (!order) {
    res.status(200).json(null)
    return
  }

  res.status(200).json(order)
}

export const updateOrderStatus = async (req: Request, res: Response) => {
  requireAdmin(req)

  const { id } = req.params
  const { status } = req.body as {
    status?: 'pending' | 'accepted' | 'preparing' | 'served' | 'cancelled'
  }

  const validStatuses = ['pending', 'accepted', 'preparing', 'served', 'cancelled']

  if (!status || !validStatuses.includes(status)) {
    throw new HttpError('Invalid order status', 400)
  }

  const order = await OrderModel.findByIdAndUpdate(id, { status }, { new: true })

  if (!order) {
    throw new HttpError('Order not found', 404)
  }

  res.status(200).json(order)
}

export const updateOrderBillStatus = async (req: Request, res: Response) => {
  requireAdmin(req)

  const { id } = req.params
  const { billStatus } = req.body as {
    billStatus?: 'unpaid' | 'paid'
  }

  if (!billStatus || !['unpaid', 'paid'].includes(billStatus)) {
    throw new HttpError('Invalid bill status', 400)
  }

  const order = await OrderModel.findByIdAndUpdate(
    id,
    {
      billStatus,
      billSettledAt: billStatus === 'paid' ? new Date() : null,
    },
    { new: true }
  )

  if (!order) {
    throw new HttpError('Order not found', 404)
  }

  res.status(200).json(order)
}
