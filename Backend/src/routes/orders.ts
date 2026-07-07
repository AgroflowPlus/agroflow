import { Router, Response } from 'express'
import prisma from '../db/index'
import { protect, AuthRequest } from '../middleware/auth'

const router = Router()

// ── Helper to safely get param as string ──────────────────
const getParam = (param: string | string[] | undefined): string =>
  Array.isArray(param) ? param[0] : param || ''

// ── GET ALL ORDERS FOR THE CURRENT USER ────────────────────
router.get('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id

    // Get buyer and seller profiles for this user
    const buyer = await prisma.buyer.findUnique({
      where: { userId },
    })

    const seller = await prisma.seller.findUnique({
      where: { userId },
    })

    // Build filter to get orders where user is either buyer or seller
    const filter: any = {}
    if (buyer && seller) {
      filter.OR = [
        { buyerId: buyer.id },
        { sellerId: seller.id },
      ]
    } else if (buyer) {
      filter.buyerId = buyer.id
    } else if (seller) {
      filter.sellerId = seller.id
    } else {
      // No buyer or seller profile - return empty
      res.json({ orders: [] })
      return
    }

    const orders = await prisma.order.findMany({
      where: filter,
      include: {
        match: {
          include: {
            listing: true,
          },
        },
        buyer: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        seller: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Parse statusHistory from JSON string to object
    const formattedOrders = orders.map((order: any) => ({
      ...order,
      statusHistory: typeof order.statusHistory === 'string' 
        ? JSON.parse(order.statusHistory) 
        : order.statusHistory,
    }))

    res.json({ orders: formattedOrders })
  } catch (error) {
    console.error('Get orders error:', error)
    res.status(500).json({ error: 'Failed to fetch orders' })
  }
})

// ── GET A SINGLE ORDER ────────────────────────────────────
router.get('/:orderId', protect, async (req: AuthRequest, res: Response) => {
  try {
    const orderId = getParam(req.params.orderId)
    const userId = req.user!.id

    // Get buyer and seller profiles for this user
    const buyer = await prisma.buyer.findUnique({
      where: { userId },
    })

    const seller = await prisma.seller.findUnique({
      where: { userId },
    })

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        match: {
          include: {
            listing: true,
          },
        },
        buyer: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        seller: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    })

    if (!order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }

    // Check if user has access to this order
    const isBuyer = buyer && order.buyerId === buyer.id
    const isSeller = seller && order.sellerId === seller.id

    if (!isBuyer && !isSeller) {
      res.status(403).json({ error: 'You do not have access to this order' })
      return
    }

    // Parse statusHistory from JSON string to object
    const formattedOrder = {
      ...order,
      statusHistory: typeof order.statusHistory === 'string' 
        ? JSON.parse(order.statusHistory) 
        : order.statusHistory,
    }

    res.json({ order: formattedOrder })
  } catch (error) {
    console.error('Get order error:', error)
    res.status(500).json({ error: 'Failed to fetch order' })
  }
})

// ── UPDATE ORDER STATUS ────────────────────────────────────
router.patch('/:orderId/status', protect, async (req: AuthRequest, res: Response) => {
  try {
    const orderId = getParam(req.params.orderId)
    const { status, note } = req.body
    const userId = req.user!.id

    // Validate status
    const validStatuses = [
      'placed',
      'accepted',
      'preparing',
      'transport_assigned',
      'in_transit',
      'delivered',
      'completed',
      'cancelled',
    ]

    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      })
      return
    }

    // Get buyer and seller profiles for this user
    const buyer = await prisma.buyer.findUnique({
      where: { userId },
    })

    const seller = await prisma.seller.findUnique({
      where: { userId },
    })

    // Get the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        seller: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    if (!order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }

    // Check if user has access to update this order
    const isBuyer = buyer && order.buyerId === buyer.id
    const isSeller = seller && order.sellerId === seller.id

    if (!isBuyer && !isSeller) {
      res.status(403).json({ error: 'You do not have access to this order' })
      return
    }

    // Validate status transitions
    const currentStatus = order.status
    const validTransitions: Record<string, string[]> = {
      placed: ['accepted', 'cancelled'],
      accepted: ['preparing', 'cancelled'],
      preparing: ['transport_assigned', 'cancelled'],
      transport_assigned: ['in_transit', 'cancelled'],
      in_transit: ['delivered', 'cancelled'],
      delivered: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    }

    // Sellers can update from placed to accepted, and then through the flow
    // Buyers can only cancel or complete (after delivery)
    if (isSeller) {
      // Seller can update through the flow
      if (!validTransitions[currentStatus]?.includes(status) && status !== currentStatus) {
        res.status(400).json({
          error: `Cannot transition from ${currentStatus} to ${status}`,
        })
        return
      }
    } else if (isBuyer) {
      // Buyer can only cancel or complete (after delivery)
      if (status === 'cancelled') {
        // Buyer can cancel if order is not yet delivered or completed
        if (['delivered', 'completed'].includes(currentStatus)) {
          res.status(400).json({
            error: 'Cannot cancel an order that has been delivered or completed',
          })
          return
        }
      } else if (status === 'completed') {
        // Buyer can complete only after delivery
        if (currentStatus !== 'delivered') {
          res.status(400).json({
            error: 'Can only complete an order after it has been delivered',
          })
          return
        }
      } else {
        res.status(400).json({
          error: 'Buyers can only cancel or complete orders',
        })
        return
      }
    }

    // Parse existing status history
    let statusHistory: Array<{ status: string; timestamp: string; note?: string }> = []
    try {
      statusHistory = typeof order.statusHistory === 'string'
        ? JSON.parse(order.statusHistory)
        : order.statusHistory || []
    } catch {
      statusHistory = []
    }

    // Add new status entry
    statusHistory.push({
      status,
      timestamp: new Date().toISOString(),
      note: note || `Status updated to ${status}`,
    })

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: status as any,
        statusHistory: JSON.stringify(statusHistory),
        notes: note ? (order.notes ? `${order.notes}\n${note}` : note) : order.notes,
      },
      include: {
        match: {
          include: {
            listing: true,
          },
        },
        buyer: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        seller: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    })

    // Parse statusHistory for response
    const formattedOrder = {
      ...updatedOrder,
      statusHistory: typeof updatedOrder.statusHistory === 'string'
        ? JSON.parse(updatedOrder.statusHistory)
        : updatedOrder.statusHistory,
    }

    res.json({
      message: 'Order status updated successfully',
      order: formattedOrder,
    })
  } catch (error) {
    console.error('Update order status error:', error)
    res.status(500).json({ error: 'Failed to update order status' })
  }
})

// ── CANCEL ORDER ──────────────────────────────────────────
router.patch('/:orderId/cancel', protect, async (req: AuthRequest, res: Response) => {
  try {
    const orderId = getParam(req.params.orderId)
    const { reason } = req.body
    const userId = req.user!.id

    // Get buyer and seller profiles for this user
    const buyer = await prisma.buyer.findUnique({
      where: { userId },
    })

    const seller = await prisma.seller.findUnique({
      where: { userId },
    })

    // Get the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        seller: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    if (!order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }

    // Check if user has access to cancel this order
    const isBuyer = buyer && order.buyerId === buyer.id
    const isSeller = seller && order.sellerId === seller.id

    if (!isBuyer && !isSeller) {
      res.status(403).json({ error: 'You do not have access to this order' })
      return
    }

    // Check if order can be cancelled
    if (['delivered', 'completed'].includes(order.status)) {
      res.status(400).json({
        error: 'Cannot cancel an order that has been delivered or completed',
      })
      return
    }

    if (order.status === 'cancelled') {
      res.status(400).json({ error: 'Order is already cancelled' })
      return
    }

    // Parse existing status history
    let statusHistory: Array<{ status: string; timestamp: string; note?: string }> = []
    try {
      statusHistory = typeof order.statusHistory === 'string'
        ? JSON.parse(order.statusHistory)
        : order.statusHistory || []
    } catch {
      statusHistory = []
    }

    // Add cancellation entry
    statusHistory.push({
      status: 'cancelled',
      timestamp: new Date().toISOString(),
      note: reason || `Order cancelled by ${isSeller ? 'seller' : 'buyer'}`,
    })

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'cancelled',
        statusHistory: JSON.stringify(statusHistory),
        notes: order.notes ? `${order.notes}\nCancelled: ${reason || 'No reason provided'}` : `Cancelled: ${reason || 'No reason provided'}`,
      },
      include: {
        match: {
          include: {
            listing: true,
          },
        },
        buyer: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        seller: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    })

    // Parse statusHistory for response
    const formattedOrder = {
      ...updatedOrder,
      statusHistory: typeof updatedOrder.statusHistory === 'string'
        ? JSON.parse(updatedOrder.statusHistory)
        : updatedOrder.statusHistory,
    }

    res.json({
      message: 'Order cancelled successfully',
      order: formattedOrder,
    })
  } catch (error) {
    console.error('Cancel order error:', error)
    res.status(500).json({ error: 'Failed to cancel order' })
  }
})

export default router