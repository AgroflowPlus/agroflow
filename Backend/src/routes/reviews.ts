import { Router, Response } from 'express'
import prisma from '../db/index'
import { protect, AuthRequest } from '../middleware/auth'

const router = Router()

// Submit a review
router.post('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { orderId, rating, comment } = req.body

    if (!orderId || !rating || rating < 1 || rating > 5) {
      res.status(400).json({ error: 'Valid orderId and rating (1-5) required' })
      return
    }

    // Verify order exists and belongs to this buyer
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { match: true }
    })

    if (!order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }

    if (order.status !== 'completed') {
      res.status(400).json({ error: 'Can only review completed orders' })
      return
    }

    // Check if already reviewed
    const existing = await prisma.review.findUnique({ where: { orderId } })
    if (existing) {
      res.status(400).json({ error: 'You already reviewed this order' })
      return
    }

    const review = await prisma.review.create({
      data: {
        orderId,
        reviewerId: req.user!.id,
        sellerId:   order.sellerId,
        rating,
        comment:    comment || null,
      }
    })

    res.json({ success: true, review })
  } catch (error: any) {
    console.error('Review error:', error)
    res.status(500).json({ error: 'Failed to submit review' })
  }
})

// Get reviews for a seller
router.get('/seller/:sellerId', async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where:   { sellerId: req.params.sellerId },
      include: { reviewer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    })

    const avg = reviews.length > 0
      ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
      : 0

    res.json({ reviews, averageRating: Math.round(avg * 10) / 10, total: reviews.length })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reviews' })
  }
})

export default router