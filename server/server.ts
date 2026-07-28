import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import cors from 'cors'
import express, { type NextFunction, type Request, type Response } from 'express'
import session from 'express-session'
import MongoStore from 'connect-mongo'
import connectDB from './src/config/db.js'
import ensureDefaultAdmin from './src/config/seedAdmin.js'
import itemRoutes from './src/routes/itemRoutes.js'
import orderRoutes from './src/routes/orderRoutes.js'
import authRoutes from './src/routes/authRoutes.js'
import categoryRoutes from './src/routes/categoryRoutes.js'
import tableRoutes from './src/routes/tableRoutes.js'
import customerRoutes from './src/routes/customerRoutes.js'
import feedbackRoutes from './src/routes/feedbackRoutes.js'
import HttpError from './src/utils/httpError.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

config({ path: path.resolve(__dirname, '.env') })

const app = express()
const PORT = Number(process.env.PORT) || 5000
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173'
const SESSION_SECRET = process.env.SESSION_SECRET ?? 'replace-this-session-secret'
const MONGO_URI = process.env.MONGO_URI

app.use(
	cors({
		origin: CLIENT_ORIGIN,
		credentials: true,
	})
)
app.use(express.json())
app.use(
	session({
		name: 'shopqr.sid',
		secret: SESSION_SECRET,
		store: MONGO_URI
			? MongoStore.create({
				mongoUrl: MONGO_URI,
				collectionName: 'sessions',
			})
			: undefined,
		resave: false,
		saveUninitialized: false,
		cookie: {
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			maxAge: 1000 * 60 * 60 * 1,
		},
	})
)

app.get('/api/health', (_req: Request, res: Response) => {
	res.status(200).json({ ok: true, service: 'MyFav API' })
})

app.use('/api/auth', authRoutes)
app.use('/api/items', itemRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/tables', tableRoutes)
app.use('/api/customers', customerRoutes)
app.use('/api/feedback', feedbackRoutes)

app.use((_req: Request, res: Response) => {
	res.status(404).json({ message: 'Route not found' })
})

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
	if (err instanceof HttpError) {
		if (err.statusCode >= 500) {
			console.error('Unhandled error:', err)
		}
		res.status(err.statusCode).json({ message: err.message })
		return
	}

	console.error('Unhandled error:', err)

	res.status(500).json({ message: 'Internal server error' })
})

const startServer = async () => {
	try {
		await connectDB()
		await ensureDefaultAdmin()
		app.listen(PORT, () => {
			console.log(`Server running on port ${PORT}`)
		})
	} catch (error) {
		console.error('Failed to start server:', error)
		process.exit(1)
	}
}

void startServer()
