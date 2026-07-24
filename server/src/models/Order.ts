import { model, Schema, type InferSchemaType, type Types } from 'mongoose'

const orderItemSchema = new Schema(
  {
    itemId: {
      type: Schema.Types.ObjectId,
      ref: 'Item',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
)

const orderSchema = new Schema(
  {
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
    },
    tableCode: {
      type: String,
      required: true,
      trim: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: [(value: unknown[]) => value.length > 0, 'Order must have items'],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'preparing', 'served', 'cancelled'],
      default: 'pending',
    },
    billStatus: {
      type: String,
      enum: ['unpaid', 'paid'],
      default: 'unpaid',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi', 'card', 'razorpay', null],
      default: null,
    },
    paymentPaidAt: {
      type: Date,
      default: null,
    },
    billSettledAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
)

export type Order = Omit<InferSchemaType<typeof orderSchema>, 'items'> & {
  items: Array<{
    itemId: Types.ObjectId
    name: string
    price: number
    quantity: number
    lineTotal: number
  }>
}

const OrderModel = model('Order', orderSchema)

export default OrderModel
