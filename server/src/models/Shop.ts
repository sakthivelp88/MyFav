import { model, Schema, type InferSchemaType } from 'mongoose'

const shopSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    qrCode: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
)

export type Shop = InferSchemaType<typeof shopSchema>

const ShopModel = model('Shop', shopSchema)

export default ShopModel
