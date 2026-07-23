import { model, Schema, type InferSchemaType } from 'mongoose'

const adminUserSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['admin'],
      default: 'admin',
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
)

export type AdminUser = InferSchemaType<typeof adminUserSchema>

const AdminUserModel = model('AdminUser', adminUserSchema)

export default AdminUserModel
