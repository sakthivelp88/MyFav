import type { Request, Response } from 'express'
import ShopModel from '../models/Shop.js'

export const getShops = async (_req: Request, res: Response) => {
  const shops = await ShopModel.find().sort({ createdAt: -1 })
  res.status(200).json(shops)
}

export const createShop = async (req: Request, res: Response) => {
  const { name, qrCode, active } = req.body as {
    name?: string
    qrCode?: string
    active?: boolean
  }

  if (!name || !qrCode) {
    res.status(400).json({ message: 'name and qrCode are required' })
    return
  }

  const shop = await ShopModel.create({
    name,
    qrCode,
    active: active ?? true,
  })

  res.status(201).json(shop)
}
