import { model, Schema, type InferSchemaType } from 'mongoose'

const customerSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    lastTableCode: {
      type: String,
      required: true,
      trim: true,
    },
    totalOrders: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalSpent: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    lastOrderedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
)

export type Customer = InferSchemaType<typeof customerSchema>

const CustomerModel = model('Customer', customerSchema)

export default CustomerModel
