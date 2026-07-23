import { model, Schema, type InferSchemaType } from 'mongoose'

const itemSchema = new Schema(
  {
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
    available: {
      type: Boolean,
      default: true,
    },
    category: {
      type: String,
      default: 'tea',
      trim: true,
    },
  },
  { timestamps: true }
)

export type Item = InferSchemaType<typeof itemSchema>

const ItemModel = model('Item', itemSchema)

export default ItemModel
