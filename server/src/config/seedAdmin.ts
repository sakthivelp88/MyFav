import bcrypt from 'bcryptjs'
import AdminUserModel from '../models/AdminUser.js'

const DEFAULT_ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? 'admin'
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin123'
const BCRYPT_ROUNDS = 12

const ensureDefaultAdmin = async () => {
  const existingAdmin = await AdminUserModel.findOne({
    username: DEFAULT_ADMIN_USERNAME,
  })

  if (existingAdmin) {
    console.log(`Default admin already exists: ${DEFAULT_ADMIN_USERNAME}`)
    return
  }

  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, BCRYPT_ROUNDS)

  await AdminUserModel.create({
    username: DEFAULT_ADMIN_USERNAME,
    passwordHash,
    role: 'admin',
    active: true,
  })

  console.log(`Seeded default admin user: ${DEFAULT_ADMIN_USERNAME}`)
}

export default ensureDefaultAdmin
