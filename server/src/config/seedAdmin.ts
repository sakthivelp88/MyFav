import bcrypt from 'bcryptjs'
import AdminUserModel from '../models/AdminUser.js'

const DEFAULT_ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? 'admin'
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin123'
const BCRYPT_ROUNDS = 12

const ensureDefaultAdmin = async () => {
  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, BCRYPT_ROUNDS)

  const result = await AdminUserModel.findOneAndUpdate(
    { username: DEFAULT_ADMIN_USERNAME },
    {
      username: DEFAULT_ADMIN_USERNAME,
      passwordHash,
      role: 'admin',
      active: true,
    },
    { upsert: true, new: true }
  )

  if (result) {
    console.log(`Admin user ready: ${DEFAULT_ADMIN_USERNAME}`)
  }
}

export default ensureDefaultAdmin
