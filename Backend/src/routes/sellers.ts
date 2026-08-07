import { Router, Response } from 'express'
import prisma from '../db/index'
import { protect, AuthRequest } from '../middleware/auth'

const router = Router()

// ── Helper to safely get param ────────────────────────────
const getParam = (param: string | string[] | undefined): string =>
  Array.isArray(param) ? param[0] : param || ''

// ── GET MY VERIFICATION STATUS ────────────────────────────
router.get('/my/status', protect, async (req: AuthRequest, res: Response) => {
  console.log('📋 GET /my/status called')
  
  try {
    const userId = req.user!.id
    console.log('👤 User ID:', userId)

    const seller = await prisma.seller.findUnique({
      where: { userId },
      select: {
        id: true,
        verificationStatus: true,
        selfieUrl: true,
        verificationNote: true,
        updatedAt: true,
      },
    })

    if (!seller) {
      console.log('⚠️ No seller found for user:', userId)
      res.json({ verificationStatus: 'unverified' })
      return
    }

    console.log('✅ Seller found:', seller.id, 'Status:', seller.verificationStatus)
    res.json({ seller })
  } catch (error) {
    console.error('❌ Get verification status error:', error)
    res.status(500).json({ error: 'Failed to get verification status' })
  }
})

// ── SUBMIT VERIFICATION (seller) ─────────────────────────
router.post('/verify', protect, async (req: AuthRequest, res: Response) => {
  console.log('📋 POST /verify called')
  console.log('📦 Body:', req.body)
  
  try {
    const { selfieUrl, description, farmName, yearsExperience } = req.body
    const userId = req.user!.id
    console.log('👤 User ID:', userId)

    if (!selfieUrl) {
      console.log('⚠️ No selfie provided')
      res.status(400).json({ error: 'Selfie photo is required' })
      return
    }

    // Build verification note with all the details
    let verificationNote = '';
    if (farmName) verificationNote += `Farm: ${farmName}. `;
    if (yearsExperience) verificationNote += `Experience: ${yearsExperience} years. `;
    if (description) verificationNote += `Description: ${description}`;

    console.log('📝 Verification note:', verificationNote)

    // Check if seller profile exists
    let seller = await prisma.seller.findUnique({
      where: { userId },
    })
    console.log('🔍 Existing seller:', seller ? 'Found' : 'Not found')

    if (!seller) {
      // Create seller profile if it doesn't exist
      seller = await prisma.seller.create({
        data: {
          userId,
          verificationStatus: 'pending',
          selfieUrl,
          verificationNote: verificationNote || 'No additional info provided',
        },
      })
      console.log('✅ New seller created:', seller.id)
    } else {
      // Update existing seller with verification request
      seller = await prisma.seller.update({
        where: { userId },
        data: {
          verificationStatus: 'pending',
          selfieUrl,
          verificationNote: verificationNote || 'No additional info provided',
        },
      })
      console.log('✅ Seller updated:', seller.id)
    }

    res.json({
      message: 'Verification submitted successfully',
      seller: {
        id: seller.id,
        verificationStatus: seller.verificationStatus,
        selfieUrl: seller.selfieUrl,
      },
    })
  } catch (error) {
    console.error('❌ Submit verification error:', error)
    res.status(500).json({ error: 'Failed to submit verification' })
  }
})

// ── GET ALL SELLERS ──────────────────────────────────────
router.get('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    const sellers = await prisma.seller.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            location: true,
          },
        },
        listings: {
          select: {
            id: true,
            cropType: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ sellers })
  } catch (error) {
    console.error('Get sellers error:', error)
    res.status(500).json({ error: 'Failed to fetch sellers' })
  }
})

// ── GET PENDING SELLERS ──────────────────────────────────
router.get('/pending', protect, async (req: AuthRequest, res: Response) => {
  try {
    const sellers = await prisma.seller.findMany({
      where: {
        verificationStatus: 'pending',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            location: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })
    res.json({ sellers })
  } catch (error) {
    console.error('Get pending sellers error:', error)
    res.status(500).json({ error: 'Failed to fetch pending sellers' })
  }
})

// ── ADMIN: APPROVE SELLER ────────────────────────────────
router.patch('/:id/approve', protect, async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req.params.id)
    const { note } = req.body

    if (!id) {
      res.status(400).json({ error: 'Seller ID is required' })
      return
    }

    // Check if user is admin
    const admin = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { role: true },
    })

    if (admin?.role !== 'admin') {
      res.status(403).json({ error: 'Only admins can approve sellers' })
      return
    }

    const seller = await prisma.seller.update({
      where: { id },
      data: {
        verificationStatus: 'verified',
        verificationNote: note || 'Approved',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    res.json({
      message: 'Seller approved successfully',
      seller,
    })
  } catch (error) {
    console.error('Approve seller error:', error)
    res.status(500).json({ error: 'Failed to approve seller' })
  }
})

// ── ADMIN: REJECT SELLER ─────────────────────────────────
router.patch('/:id/reject', protect, async (req: AuthRequest, res: Response) => {
  try {
    const id = getParam(req.params.id)
    const { reason } = req.body

    if (!id) {
      res.status(400).json({ error: 'Seller ID is required' })
      return
    }

    if (!reason) {
      res.status(400).json({ error: 'Rejection reason is required' })
      return
    }

    // Check if user is admin
    const admin = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { role: true },
    })

    if (admin?.role !== 'admin') {
      res.status(403).json({ error: 'Only admins can reject sellers' })
      return
    }

    const seller = await prisma.seller.update({
      where: { id },
      data: {
        verificationStatus: 'rejected',
        verificationNote: reason,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    res.json({
      message: 'Seller rejected',
      seller,
    })
  } catch (error) {
    console.error('Reject seller error:', error)
    res.status(500).json({ error: 'Failed to reject seller' })
  }
})

export default router