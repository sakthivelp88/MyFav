import { model, Schema } from 'mongoose'

const settingSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    value: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { timestamps: true }
)

const SettingModel = model('Setting', settingSchema)

export default SettingModel
