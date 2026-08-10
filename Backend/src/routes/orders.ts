import { Router, Response } from 'express'
import prisma from '../db/index'
import { protect, AuthRequest } from '../middleware/auth'
import { 
  notifyOrderStatusUpdate,
  notifyNewOrderToAdmins,
  notifyOrderCancelledToSeller,
  notifyDeliveryConfirmedToSeller
} from '../services/notificationService'

const router = Router()

// ── Helper to safely get param as string ──────────────────
const getParam = (param: string | string[] | undefined): string =>
  Array.isArray(param) ? param[0] : param || ''

// ── CREATE ORDER FROM MATCH ──────────────────────────────────
export async function createOrderFromMatch(
  matchId: string, 
  buyerId: string, 
  sellerId: string, 
  quantity: number, 
  listingId: string
) {
  // ── Check for duplicate order ──────────────────────────────
  const existing = await prisma.order.findFirst({
    where: { matchId }
  })
  if (existing) return existing

  // ── Create order ────────────────────────────────────────────
  const order = await prisma.order.create({
    data: {
      matchId, 
      buyerId, 
      sellerId,
      status: 'placed',
      statusHistory: JSON.stringify([
        { status: 'placed', timestamp: new Date().toISOString(), note: 'Order placed' }
      ])
    }
  })

  // ── Update listing remaining quantity ──────────────────────
  const listing = await prisma.listing.findUnique({ 
    where: { id: listingId } 
  })
  
  if (listing) {
    const newQty = Math.max(0, listing.remainingQty - quantity)
    const newStatus = newQty === 0 ? 'sold' : newQty < listing.quantity ? 'partial' : 'available'
    
    await prisma.listing.update({
      where: { id: listingId },
      data: {
        remainingQty: newQty,
        status: newStatus,
      }
    })
    
    console.log(`📦 Listing ${listingId} updated: remainingQty ${listing.remainingQty} → ${newQty}, status: ${newStatus}`)
  }

  // ── NOTIFY ADMINS ABOUT NEW ORDER ──────────────────────────
  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        buyer: { include: { user: true } },
        seller: { include: { user: true } }
      }
    })
    if (match) {
      await notifyNewOrderToAdmins(
        match.cropType,
        match.quantity,
        match.buyer.user.name,
        match.seller.user.name,
        order.id
      )
      console.log(`🔔 Admin notification sent for new order ${order.id}`)
    }
  } catch (notifyError) {
    console.error('Failed to send admin order notification:', notifyError)
  }

  return order
}

// ── GET ALL ORDERS FOR THE CURRENT USER ────────────────────
router.get('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const buyer = await prisma.buyer.findUnique({
      where: { userId },
    })

    const seller = await prisma.seller.findUnique({
      where: { userId },
    })

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

    const isBuyer = buyer && order.buyerId === buyer.id
    const isSeller = seller && order.sellerId === seller.id

    if (!isBuyer && !isSeller) {
      res.status(403).json({ error: 'You do not have access to this order' })
      return
    }

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

    const buyer = await prisma.buyer.findUnique({
      where: { userId },
    })

    const seller = await prisma.seller.findUnique({
      where: { userId },
    })

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
        match: {
          include: {
            listing: true,
          },
        },
      },
    })

    if (!order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }

    const isBuyer = buyer && order.buyerId === buyer.id
    const isSeller = seller && order.sellerId === seller.id

    if (!isBuyer && !isSeller) {
      res.status(403).json({ error: 'You do not have access to this order' })
      return
    }

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

    if (isSeller) {
      if (!validTransitions[currentStatus]?.includes(status) && status !== currentStatus) {
        res.status(400).json({
          error: `Cannot transition from ${currentStatus} to ${status}`,
        })
        return
      }
    } else if (isBuyer) {
      if (status === 'cancelled') {
        if (['delivered', 'completed'].includes(currentStatus)) {
          res.status(400).json({
            error: 'Cannot cancel an order that has been delivered or completed',
          })
          return
        }
      } else if (status === 'completed') {
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

    let statusHistory: Array<{ status: string; timestamp: string; note?: string }> = []
    try {
      statusHistory = typeof order.statusHistory === 'string'
        ? JSON.parse(order.statusHistory)
        : order.statusHistory || []
    } catch {
      statusHistory = []
    }

    statusHistory.push({
      status,
      timestamp: new Date().toISOString(),
      note: note || `Status updated to ${status}`,
    })

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

    // ── NOTIFY BUYER/SELLER ABOUT ORDER STATUS UPDATE ──────────────────────────
    try {
      const cropType = updatedOrder.match?.cropType || updatedOrder.match?.listing?.cropType || 'produce'
      
      // Notify buyer
      if (updatedOrder?.buyer?.userId) {
        console.log(`🔔 Notifying buyer ${updatedOrder.buyer.userId} about order ${updatedOrder.id} status: ${status}`)
        await notifyOrderStatusUpdate(
          [updatedOrder.buyer.userId],
          cropType,
          status,
          updatedOrder.id
        )
      }

      // Notify seller when order is completed or cancelled
      if (updatedOrder?.seller?.userId) {
        if (status === 'cancelled') {
          const quantity = updatedOrder.match?.quantity || 0
          await notifyOrderCancelledToSeller(
            updatedOrder.seller.userId,
            cropType,
            quantity
          )
        } else if (status === 'delivered') {
          await notifyDeliveryConfirmedToSeller(
            updatedOrder.seller.userId,
            cropType
          )
        }
      }
    } catch (notifyError) {
      console.error('Failed to send order status notification:', notifyError)
    }

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

    const buyer = await prisma.buyer.findUnique({
      where: { userId },
    })

    const seller = await prisma.seller.findUnique({
      where: { userId },
    })

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
        match: {
          include: {
            listing: true,
          },
        },
      },
    })

    if (!order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }

    const isBuyer = buyer && order.buyerId === buyer.id
    const isSeller = seller && order.sellerId === seller.id

    if (!isBuyer && !isSeller) {
      res.status(403).json({ error: 'You do not have access to this order' })
      return
    }

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

    const listing = await prisma.listing.findUnique({
      where: { id: order.match?.listingId }
    })

    if (listing) {
      const restoredQty = order.match?.quantity || 0
      const newQty = listing.remainingQty + restoredQty
      const newStatus = newQty > 0 ? 'available' : 'sold'
      
      await prisma.listing.update({
        where: { id: listing.id },
        data: {
          remainingQty: newQty,
          status: newStatus,
        }
      })
      
      console.log(`📦 Listing ${listing.id} restored: remainingQty ${listing.remainingQty} → ${newQty}, status: ${newStatus}`)
    }

    let statusHistory: Array<{ status: string; timestamp: string; note?: string }> = []
    try {
      statusHistory = typeof order.statusHistory === 'string'
        ? JSON.parse(order.statusHistory)
        : order.statusHistory || []
    } catch {
      statusHistory = []
    }

    statusHistory.push({
      status: 'cancelled',
      timestamp: new Date().toISOString(),
      note: reason || `Order cancelled by ${isSeller ? 'seller' : 'buyer'}`,
    })

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

    // ── NOTIFY BUYER ABOUT ORDER CANCELLATION ────────────────────────────
    try {
      if (updatedOrder?.buyer?.userId) {
        const cropType = updatedOrder.match?.cropType || updatedOrder.match?.listing?.cropType || 'produce'
        console.log(`🔔 Notifying buyer ${updatedOrder.buyer.userId} about order ${updatedOrder.id} cancellation`)
        await notifyOrderStatusUpdate(
          [updatedOrder.buyer.userId],
          cropType,
          'cancelled',
          updatedOrder.id
        )
      }
    } catch (notifyError) {
      console.error('Failed to send order cancellation notification:', notifyError)
    }

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