import { useState } from 'react';
import { useCartStore } from '../../../store/cartStore';
import { marketService } from '../../../services/marketService';
import { useToast } from '../../../context/ToastContext';
import { LoadingButton } from '../../../components/LoadingButton/LoadingButton';

interface Props {
  onOrderPlaced: () => void;
}

export function SectionCart({ onOrderPlaced }: Props) {
  const { items, removeItem, updateQty, clearCart } = useCartStore();
  const { addToast } = useToast();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const totalQuantity = items.reduce((s, i) => s + i.quantity, 0);

  const handleCheckout = async () => {
    if (items.length === 0) {
      addToast('Your cart is empty', 'error');
      return;
    }

    setIsCheckingOut(true);
    try {
      // Submit each item as a request
      const results = await Promise.all(
        items.map(async (item) => {
          const result = await marketService.createRequest(
            item.listing.id,
            item.quantity,
            `Order from cart: ${item.quantity}kg of ${item.listing.cropType}`,
            item.listing.location
          );
          return result;
        })
      );

      const failed = results.filter((r) => !r.success);
      if (failed.length > 0) {
        addToast(`${failed.length} items failed to order`, 'error');
      } else {
        addToast('All orders placed successfully!', 'success');
        clearCart();
        onOrderPlaced();
      }
    } catch (error) {
      console.error('Checkout error:', error);
      addToast('Failed to place orders. Please try again.', 'error');
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (items.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#9ead9f' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Your cart is empty</div>
        <div style={{ fontSize: 13 }}>Browse the marketplace and add items you want to buy</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#141f15' }}>Your Cart</h2>
        <button
          onClick={clearCart}
          disabled={isCheckingOut}
          style={{
            fontSize: 12,
            color: '#e05252',
            background: 'none',
            border: 'none',
            cursor: isCheckingOut ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            opacity: isCheckingOut ? 0.5 : 1,
          }}
        >
          Clear All
        </button>
      </div>

      {items.map((item) => (
        <div
          key={item.listing.id}
          style={{
            background: '#fff',
            border: '1.5px solid #eaeee8',
            borderRadius: 16,
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            opacity: isCheckingOut ? 0.7 : 1,
          }}
        >
          {/* Photo */}
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 10,
              background: '#f2f9e4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              flexShrink: 0,
            }}
          >
            {item.listing.photoUrl ? (
              <img
                src={item.listing.photoUrl}
                alt={item.listing.cropType}
                style={{ width: 60, height: 60, borderRadius: 10, objectFit: 'cover' }}
              />
            ) : (
              '🌾'
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#141f15' }}>
              {item.listing.cropType}
            </div>
            <div style={{ fontSize: 12, color: '#9ead9f' }}>
              {item.listing.location}
            </div>
            <div style={{ fontSize: 12, color: '#9ead9f', marginTop: 2 }}>
              Seller: {item.listing.sellerName}
            </div>
          </div>

          {/* Quantity controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => updateQty(item.listing.id, item.quantity - 1)}
              disabled={isCheckingOut}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                border: '1.5px solid #eaeee8',
                background: 'transparent',
                cursor: isCheckingOut ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                opacity: isCheckingOut ? 0.5 : 1,
              }}
            >
              −
            </button>
            <span style={{ fontWeight: 600, fontSize: 14, minWidth: 24, textAlign: 'center' }}>
              {item.quantity}
            </span>
            <button
              onClick={() => updateQty(item.listing.id, item.quantity + 1)}
              disabled={isCheckingOut}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                border: '1.5px solid #eaeee8',
                background: 'transparent',
                cursor: isCheckingOut ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                opacity: isCheckingOut ? 0.5 : 1,
              }}
            >
              +
            </button>
          </div>

          {/* Remove button */}
          <button
            onClick={() => removeItem(item.listing.id)}
            disabled={isCheckingOut}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ead9f',
              cursor: isCheckingOut ? 'not-allowed' : 'pointer',
              fontSize: 18,
              padding: 4,
              opacity: isCheckingOut ? 0.5 : 1,
            }}
          >
            ✕
          </button>
        </div>
      ))}

      {/* Summary */}
      <div
        style={{
          background: '#f7f8f5',
          borderRadius: 16,
          padding: 16,
          marginTop: 8,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7f6e' }}>
          <span>Total quantity</span>
          <span>{totalQuantity}kg</span>
        </div>
      </div>

      {/* Checkout button */}
      <LoadingButton
        loading={isCheckingOut}
        className="w-full"
        onClick={handleCheckout}
        style={{
          padding: '14px',
          borderRadius: 12,
          background: '#a8d832',
          color: '#141f15',
          border: 'none',
          fontWeight: 700,
          fontSize: 16,
          cursor: isCheckingOut ? 'not-allowed' : 'pointer',
          marginTop: 8,
          width: '100%',
        }}
      >
        Place Order ({items.length} items)
      </LoadingButton>
    </div>
  );
}