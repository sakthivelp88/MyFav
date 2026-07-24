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

const normalizeOrderItems = async (items: CreateOrderItem[]) => {
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

  return {
    normalizedItems,
    dbItems,
  }
}

const ensureNumberStockAvailable = (
  dbItems: Awaited<ReturnType<typeof ItemModel.find>>,
  items: CreateOrderItem[]
) => {
  for (const entry of items) {
    const item = dbItems.find((dbItem) => dbItem.id === entry.itemId)

    if (!item || item.stockUnit !== 'numbers') {
      continue
    }

    if (item.stockQuantity < entry.quantity) {
      throw new HttpError(`Insufficient stock for ${item.name}`, 400)
    }
  }
}

const applyNumberStockForCreate = async (
  dbItems: Awaited<ReturnType<typeof ItemModel.find>>,
  items: CreateOrderItem[]
) => {
  for (const entry of items) {
    const item = dbItems.find((dbItem) => dbItem.id === entry.itemId)

    if (!item || item.stockUnit !== 'numbers') {
      continue
    }

    item.stockQuantity -= entry.quantity
    if (item.stockQuantity <= 0) {
      item.stockQuantity = 0
      item.available = false
    }
    await item.save()
  }
}

const reconcileNumberStockForOrderEdit = async (
  existingOrder: {
    items: Array<{
      itemId: { toString(): string } | string
      quantity: number
    }>
  } | null,
  nextItems: CreateOrderItem[]
) => {
  if (!existingOrder) {
    return
  }

  const previousMap = new Map<string, number>()
  for (const item of existingOrder.items) {
    previousMap.set(String(item.itemId), item.quantity)
  }

  const nextMap = new Map(nextItems.map((item) => [item.itemId, item.quantity]))
  const affectedIds = Array.from(new Set([...previousMap.keys(), ...nextMap.keys()]))
  const dbItems = await ItemModel.find({ _id: { $in: affectedIds } })

  for (const item of dbItems) {
    if (item.stockUnit !== 'numbers') {
      continue
    }

    const previousQty = previousMap.get(item.id) ?? 0
    const nextQty = nextMap.get(item.id) ?? 0
    const delta = nextQty - previousQty

    if (delta > 0 && item.stockQuantity < delta) {
      throw new HttpError(`Insufficient stock for ${item.name}`, 400)
    }
  }

  for (const item of dbItems) {
    if (item.stockUnit !== 'numbers') {
      continue
    }

    const previousQty = previousMap.get(item.id) ?? 0
    const nextQty = nextMap.get(item.id) ?? 0
    const delta = nextQty - previousQty

    item.stockQuantity -= delta
    if (item.stockQuantity < 0) {
      item.stockQuantity = 0
    }
    item.available = item.stockQuantity > 0
    await item.save()
  }
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

  const { normalizedItems, dbItems } = await normalizeOrderItems(items)
  ensureNumberStockAvailable(dbItems, items)

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
    paymentStatus: 'pending',
    paymentMethod: null,
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

  await applyNumberStockForCreate(dbItems, items)

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

export const updateCustomerOrder = async (req: Request, res: Response) => {
  const { id } = req.params
  const { customerName, customerPhone, tableCode, items } = req.body as {
    customerName?: string
    customerPhone?: string
    tableCode?: string
    items?: CreateOrderItem[]
  }

  if (!customerName?.trim() || !customerPhone?.trim() || !tableCode?.trim()) {
    throw new HttpError('customerName, customerPhone and tableCode are required', 400)
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new HttpError('At least one item is required', 400)
  }

  const existingOrder = await OrderModel.findById(id)

  if (!existingOrder) {
    throw new HttpError('Order not found', 404)
  }

  if (existingOrder.status !== 'pending' || existingOrder.paymentStatus === 'paid') {
    throw new HttpError('Only unpaid pending orders can be edited', 400)
  }

  const { normalizedItems } = await normalizeOrderItems(items)
  await reconcileNumberStockForOrderEdit(existingOrder, items)
  const totalAmount = normalizedItems.reduce((sum, current) => sum + current.lineTotal, 0)

  existingOrder.set({
    customerName: customerName.trim(),
    customerPhone: customerPhone.trim(),
    tableCode: tableCode.trim().toUpperCase(),
    items: normalizedItems,
    totalAmount,
  })

  await existingOrder.save()

  res.status(200).json(existingOrder)
}

export const payForOrder = async (req: Request, res: Response) => {
  const { id } = req.params
  const { paymentMethod } = req.body as {
    paymentMethod?: 'cash' | 'upi' | 'card' | 'razorpay'
  }

  if (!paymentMethod || !['cash', 'upi', 'card', 'razorpay'].includes(paymentMethod)) {
    throw new HttpError('Invalid payment method', 400)
  }

  const order = await OrderModel.findById(id)

  if (!order) {
    throw new HttpError('Order not found', 404)
  }

  order.paymentMethod = paymentMethod
  order.paymentStatus = 'paid'
  order.paymentPaidAt = new Date()
  order.billStatus = 'paid'
  order.billSettledAt = new Date()

  await order.save()

  res.status(200).json(order)
}
