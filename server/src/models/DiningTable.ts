import { model, Schema, type InferSchemaType } from 'mongoose'

const diningTableSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      uppercase: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
)

export type DiningTable = InferSchemaType<typeof diningTableSchema>

const DiningTableModel = model('DiningTable', diningTableSchema)

export default DiningTableModel
