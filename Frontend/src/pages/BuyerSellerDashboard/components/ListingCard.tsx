import { useState, useEffect } from 'react';
import { RiMapPinLine } from "react-icons/ri";
import { GiFarmer } from "react-icons/gi";
import { MdAddShoppingCart } from "react-icons/md";
import { CROP_ICON, CROP_CSS, getImageFallback } from "../constants";
import styles from "../BuyerSellerDashboard.module.css";
import type { Listing } from "../../../services/marketService";
import { useCartStore } from '../../../store/cartStore';
import { LoadingButton } from '../../../components/LoadingButton/LoadingButton';
import { useToast } from '../../../context/ToastContext';

interface ListingCardProps {
  listing: Listing;
  intent: "buy" | "sell";
  onRequestToBuy: (listing: Listing) => void;
  onClick?: (listing: Listing) => void;
}

export function ListingCard({ listing, intent, onRequestToBuy, onClick }: ListingCardProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const addItem = useCartStore(s => s.addItem);
  const cartItems = useCartStore(s => s.items);
  const inCart = cartItems.some(i => i.listing.id === listing.id);
  const { addToast } = useToast();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleCardClick = () => {
    // Only trigger on mobile devices
    if (isMobile && onClick) {
      onClick(listing);
    }
  };

  const handleRequestClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRequestToBuy(listing);
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAddingToCart) return;
    
    setIsAddingToCart(true);
    try {
      addItem(listing, 1);
      addToast('Added to cart!', 'success');
    } catch (error) {
      addToast('Failed to add to cart', 'error');
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <div 
      className={`${styles.marketplaceCard} ${isMobile ? styles.clickable : ''}`} 
      onClick={handleCardClick}
    >
      <div className={styles.cardPhoto}>
        {listing.photoUrl ? (
          <img
            src={listing.photoUrl}
            alt={listing.cropType}
            onError={(e) => {
              (e.target as HTMLImageElement).src = getImageFallback(listing.cropType);
            }}
          />
        ) : (
          <div className={styles.photoPlaceholder}>
            <span className={styles.photoEmoji}>
              {CROP_ICON[listing.cropType]}
            </span>
            <span className={styles.photoText}>No photo</span>
          </div>
        )}
        <div
          className={`${styles.cardBadge} ${styles[CROP_CSS[listing.cropType]]}`}
        >
          {CROP_ICON[listing.cropType]} {listing.cropType}
        </div>
        {listing.status !== "available" && (
          <div className={styles.statusOverlay}>
            <span>
              {listing.status === "partial" ? "Partially Sold" : "Sold Out"}
            </span>
          </div>
        )}
      </div>
      <div className={styles.cardInfo}>
        <div className={styles.sellerRow}>
          <div className={styles.sellerAvatar}>
            <GiFarmer size={16} />
          </div>
          <div>
            <div className={styles.sellerName}>{listing.sellerName}</div>
            <div className={styles.sellerLocation}>
              <RiMapPinLine size={10} /> {listing.location} ·{" "}
              {listing.distance || "nearby"}
            </div>
          </div>
        </div>
        <div className={styles.produceStats}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{listing.remainingQty}kg</span>
            <span className={styles.statLabel}>Available</span>
          </div>
          <div className={styles.statDivider}>|</div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>Fresh</span>
            <span className={styles.statLabel}>Quality</span>
          </div>
        </div>
        {listing.description && (
          <p className={styles.produceDesc}>
            {listing.description.length > 80
              ? `${listing.description.substring(0, 80)}...`
              : listing.description}
          </p>
        )}
        
        {/* Action Buttons */}
        <div className={styles.cardActions}>
          {intent === "buy" && listing.status !== "sold" && (
            <>
              <LoadingButton
                loading={isAddingToCart}
                className={`${styles.addCartBtn} ${inCart ? styles.addCartBtnActive : ''}`}
                onClick={handleAddToCart}
                disabled={isAddingToCart}
              >
                <MdAddShoppingCart size={16} />
                {inCart ? 'In Cart' : 'Add to Cart'}
              </LoadingButton>
              <button
                className={styles.requestBtn}
                onClick={handleRequestClick}
                disabled={isAddingToCart}
              >
                Request to Buy
              </button>
            </>
          )}
          {intent === "sell" && (
            <button className={styles.yourListingBtn} disabled>
              Your Listing
            </button>
          )}
        </div>
      </div>
    </div>
  );
}