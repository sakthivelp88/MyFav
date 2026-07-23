import type { Request, Response } from 'express'
import CustomerModel from '../models/Customer.js'
import OrderModel from '../models/Order.js'
import { requireAdmin } from '../utils/roles.js'

export const listCustomerBillingSummaries = async (req: Request, res: Response) => {
  requireAdmin(req)

  const [customers, unpaidByPhone] = await Promise.all([
    CustomerModel.find().sort({ lastOrderedAt: -1 }).lean(),
    OrderModel.aggregate<{
      _id: string
      unpaidAmount: number
    }>([
      {
        $match: {
          billStatus: 'unpaid',
        },
      },
      {
        $group: {
          _id: '$customerPhone',
          unpaidAmount: { $sum: '$totalAmount' },
        },
      },
    ]),
  ])

  const unpaidMap = new Map(unpaidByPhone.map((entry) => [entry._id, entry.unpaidAmount]))

  const summaries = customers.map((customer) => {
    const unpaidAmount = unpaidMap.get(customer.phone) ?? 0

    return {
      customerName: customer.name,
      customerPhone: customer.phone,
      lastTableCode: customer.lastTableCode,
      totalOrders: customer.totalOrders,
      totalSpent: customer.totalSpent,
      unpaidAmount,
      lastOrderedAt: customer.lastOrderedAt,
    }
  })

  res.status(200).json(summaries)
}
