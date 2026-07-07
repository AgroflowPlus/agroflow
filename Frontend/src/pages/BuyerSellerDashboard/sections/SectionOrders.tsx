import { marketService } from '../../../services/marketService'
import { useToast } from '../../../context/ToastContext'
import {
  RiCheckLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiTruckLine,
  RiStore3Line,
  RiHomeLine,
  RiLeafLine,
  RiShoppingBagLine,
  RiTimeLine,
  RiArrowRightLine,
} from 'react-icons/ri'
// import styles from '../BuyerSellerDashboard.module.css'

const STATUS_STEPS = ['placed','accepted','preparing','transport_assigned','in_transit','delivered','completed']
const STATUS_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  placed: {
    label: 'Order Placed',
    icon: <RiShoppingBagLine size={14} />,
  },
  accepted: {
    label: 'Seller Accepted',
    icon: <RiCheckLine size={14} />,
  },
  preparing: {
    label: 'Preparing Produce',
    icon: <RiLeafLine size={14} />,
  },
  transport_assigned: {
    label: 'Transport Assigned',
    icon: <RiTruckLine size={14} />,
  },
  in_transit: {
    label: 'In Transit',
    icon: <RiTimeLine size={14} />,
  },
  delivered: {
    label: 'Delivered',
    icon: <RiHomeLine size={14} />,
  },
  completed: {
    label: 'Completed',
    icon: <RiCheckboxCircleLine size={14} />,
  },
  cancelled: {
    label: 'Cancelled',
    icon: <RiCloseCircleLine size={14} />,
  },
}

const SELLER_ACTIONS: Record<string, string> = {
  placed:             'accepted',
  accepted:           'preparing',
  preparing:          'transport_assigned',
  transport_assigned: 'in_transit',
  in_transit:         'delivered',
}

const BUYER_ACTIONS: Record<string, string> = {
  delivered: 'completed',
}

interface Props {
  orders:   any[]
  role:     'seller' | 'buyer'
  onUpdate: () => void
}

export function SectionOrders({ orders, role, onUpdate }: Props) {
  const { addToast } = useToast()

  const advance = async (orderId: string, newStatus: string) => {
    const result = await marketService.updateOrderStatus(orderId, newStatus)
    if (result.success) {
      addToast(`Order updated to: ${STATUS_LABELS[newStatus].label}`, 'success')
      onUpdate()
    } else {
      addToast(result.error || 'Failed to update order', 'error')
    }
  }

  if (orders.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#9ead9f' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No orders yet</div>
        <div style={{ fontSize: 13 }}>Orders will appear here when buyers purchase your produce</div>
      </div>
    )
  }

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#141f15', marginBottom: 4 }}>
        {role === 'seller' ? 'Incoming Orders' : 'My Orders'}
      </h2>

      {orders.map(order => {
        const currentStep = STATUS_STEPS.indexOf(order.status)
        const history = typeof order.statusHistory === 'string'
          ? JSON.parse(order.statusHistory)
          : order.statusHistory || []

        const nextStatus = role === 'seller'
          ? SELLER_ACTIONS[order.status]
          : BUYER_ACTIONS[order.status]

        const statusInfo = STATUS_LABELS[order.status] || { label: order.status, icon: null }

        return (
          <div key={order.id} style={{
            background: '#fff',
            border: '1.5px solid #eaeee8',
            borderRadius: 16,
            padding: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#141f15' }}>
                  {order.match?.cropType} — {order.match?.quantity}kg
                </div>
                <div style={{ fontSize: 12, color: '#9ead9f', marginTop: 2 }}>
                  Order #{order.id.slice(-6).toUpperCase()}
                </div>
              </div>
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 12px',
                borderRadius: 100,
                fontSize: 11,
                fontWeight: 600,
                background: order.status === 'completed' ? '#e7f3d2' : order.status === 'cancelled' ? '#fef2f2' : '#f2f9e4',
                color: order.status === 'completed' ? '#2d6a35' : order.status === 'cancelled' ? '#e05252' : '#2d6a35',
              }}>
                {statusInfo.icon}
                {statusInfo.label}
              </span>
            </div>

            {/* Parties */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 12, color: '#6b7f6e' }}>
              <span><RiStore3Line size={12} style={{ verticalAlign: 'middle' }} /> {order.match?.seller?.user?.name || 'Seller'}</span>
              <RiArrowRightLine size={12} style={{ color: '#c8d4c2' }} />
              <span><RiShoppingBagLine size={12} style={{ verticalAlign: 'middle' }} /> {order.match?.buyer?.user?.name || 'Buyer'}</span>
              <span style={{ color: '#c8d4c2' }}>· {order.match?.distance}km</span>
            </div>

            {/* Progress bar */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                {STATUS_STEPS.map((step, i) => (
                  <div key={step} style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    background: i <= currentStep ? '#a8d832' : '#eaeee8',
                  }} />
                ))}
              </div>
              <div style={{ fontSize: 11, color: '#9ead9f' }}>
                Step {currentStep + 1} of {STATUS_STEPS.length}
              </div>
            </div>

            {/* Status history */}
            <div style={{ marginBottom: 16 }}>
              {history.slice(-3).map((h: any, i: number) => {
                const hStatusInfo = STATUS_LABELS[h.status] || { label: h.status, icon: null }
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#6b7f6e', marginBottom: 4 }}>
                    <span style={{ color: '#a8d832' }}><RiCheckLine size={12} /></span>
                    <span>{hStatusInfo.icon}</span>
                    <span>{hStatusInfo.label}</span>
                    <span style={{ color: '#c8d4c2', marginLeft: 'auto' }}>
                      {new Date(h.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Action button */}
            {nextStatus && order.status !== 'cancelled' && (
              <button
                onClick={() => advance(order.id, nextStatus)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 10,
                  background: '#a8d832',
                  color: '#141f15',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                Mark as: {STATUS_LABELS[nextStatus]?.icon} {STATUS_LABELS[nextStatus]?.label}
              </button>
            )}

            {order.status === 'completed' && (
              <div style={{ textAlign: 'center', color: '#2d6a35', fontWeight: 600, fontSize: 13 }}>
                <RiCheckboxCircleLine size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Order completed successfully!
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}