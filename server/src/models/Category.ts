import { model, Schema, type InferSchemaType } from 'mongoose'

const categorySchema = new Schema(
  {
    name: {
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
  { timestamps: true }
)

export type Category = InferSchemaType<typeof categorySchema>

const CategoryModel = model('Category', categorySchema)

export default CategoryModel
