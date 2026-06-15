import { useState } from 'react';
import { RiMapPinLine, RiUserLine, RiCalendarLine, RiArrowLeftLine } from 'react-icons/ri';
import { GiFarmer, GiCorn, GiTomato, GiChiliPepper, GiPlantRoots } from 'react-icons/gi';
import { useToast } from '../../context/ToastContext';
import type { Listing, CropType } from '../../services/marketService';
import styles from './ListingDetailModal.module.css';

const CROP_ICON: Record<CropType, React.ReactElement> = {
  Maize: <GiCorn size={28} />,
  Cassava: <GiPlantRoots size={28} />,
  Tomato: <GiTomato size={28} />,
  Pepper: <GiChiliPepper size={28} />,
};

interface ListingDetailModalProps {
  listing: Listing | null;
  isOpen: boolean;
  onClose: () => void;
  onRequestToBuy?: (listing: Listing) => Promise<void> | void;
}

export function ListingDetailModal({ listing, isOpen, onClose, onRequestToBuy }: ListingDetailModalProps) {
  const { addToast } = useToast();
  const [requestQty, setRequestQty] = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !listing) return null;

  const handleRequestToBuy = async () => {
    const qty = Number(requestQty);
    
    // Validation
    if (!requestQty) {
      addToast('Please enter a quantity', 'error');
      return;
    }
    
    if (qty <= 0) {
      addToast('Quantity must be greater than 0', 'error');
      return;
    }
    
    if (qty > listing.remainingQty) {
      addToast(`Only ${listing.remainingQty}kg available. Please enter a smaller quantity.`, 'error');
      return;
    }
    
    if (!onRequestToBuy) {
      addToast('Unable to process request. Please try again.', 'error');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onRequestToBuy(listing);
      addToast('Request sent successfully!', 'success');
      onClose();
    } catch (err: any) {
      addToast(err.message || 'Failed to send request. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return '#2d6a35';
      case 'partial': return '#e8a020';
      case 'sold': return '#e05252';
      default: return '#9ead9f';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'Available';
      case 'partial': return 'Partially Sold';
      case 'sold': return 'Sold Out';
      default: return status;
    }
  };

  return (
    <div className={styles.fullscreenOverlay} onClick={onClose}>
      <div className={styles.fullscreenModal} onClick={(e) => e.stopPropagation()}>
        {/* Back Button */}
        <button className={styles.backBtn} onClick={onClose}>
          <RiArrowLeftLine size={24} />
          <span>Back</span>
        </button>

        {/* Image Section */}
        <div className={styles.imageSection}>
          {listing.photoUrl ? (
            <img src={listing.photoUrl} alt={listing.cropType} className={styles.image} />
          ) : (
            <div className={styles.imagePlaceholder}>
              <div className={styles.placeholderIcon}>
                {CROP_ICON[listing.cropType]}
              </div>
              <span>No image available</span>
            </div>
          )}
          <div className={styles.statusBadge} style={{ backgroundColor: getStatusColor(listing.status) }}>
            {getStatusText(listing.status)}
          </div>
        </div>

        {/* Content Section - Scrollable */}
        <div className={styles.scrollContent}>
          <div className={styles.contentSection}>
            {/* Crop Type Header */}
            <div className={styles.cropHeader}>
              <div className={styles.cropIcon}>{CROP_ICON[listing.cropType]}</div>
              <h2 className={styles.cropName}>{listing.cropType}</h2>
            </div>

            {/* Seller Info */}
            <div className={styles.infoCard}>
              <div className={styles.infoRow}>
                <div className={styles.infoIcon}><GiFarmer size={18} /></div>
                <div className={styles.infoContent}>
                  <div className={styles.infoLabel}>Seller</div>
                  <div className={styles.infoValue}>{listing.sellerName}</div>
                </div>
              </div>
              {listing.sellerPhone && (
                <div className={styles.infoRow}>
                  <div className={styles.infoIcon}><RiUserLine size={18} /></div>
                  <div className={styles.infoContent}>
                    <div className={styles.infoLabel}>Contact</div>
                    <div className={styles.infoValue}>{listing.sellerPhone}</div>
                  </div>
                </div>
              )}
              <div className={styles.infoRow}>
                <div className={styles.infoIcon}><RiMapPinLine size={18} /></div>
                <div className={styles.infoContent}>
                  <div className={styles.infoLabel}>Location</div>
                  <div className={styles.infoValue}>{listing.location}, Akure</div>
                  {listing.distance && (
                    <div className={styles.infoSub}>{listing.distance}km away</div>
                  )}
                </div>
              </div>
              <div className={styles.infoRow}>
                <div className={styles.infoIcon}><RiCalendarLine size={18} /></div>
                <div className={styles.infoContent}>
                  <div className={styles.infoLabel}>Listed On</div>
                  <div className={styles.infoValue}>{formatDate(listing.createdAt)}</div>
                </div>
              </div>
            </div>

            {/* Quantity Stats */}
            <div className={styles.statsCard}>
              <div className={styles.statBox}>
                <div className={styles.statValue}>{listing.quantity}kg</div>
                <div className={styles.statLabel}>Total Quantity</div>
              </div>
              <div className={styles.statDivider}></div>
              <div className={styles.statBox}>
                <div className={styles.statValue}>{listing.remainingQty}kg</div>
                <div className={styles.statLabel}>Remaining</div>
              </div>
            </div>

            {/* Description */}
            {listing.description && (
              <div className={styles.descriptionCard}>
                <div className={styles.descriptionTitle}>Description</div>
                <p className={styles.descriptionText}>{listing.description}</p>
              </div>
            )}

            {/* Action Buttons */}
            {listing.status !== 'sold' && (
              <div className={styles.actionSection}>
                {!showRequestForm ? (
                  <button 
                    className={styles.requestBtn}
                    onClick={() => setShowRequestForm(true)}
                  >
                    Request to Buy
                  </button>
                ) : (
                  <div className={styles.requestForm}>
                    <div className={styles.requestFormTitle}>How many kg do you need?</div>
                    
                    <div className={styles.quantityHint}>
                      Available: {listing.remainingQty}kg
                    </div>
                    
                    <input
                      type="number"
                      className={styles.quantityInput}
                      value={requestQty}
                      onChange={(e) => setRequestQty(e.target.value)}
                      placeholder={`Max ${listing.remainingQty}kg`}
                      min={1}
                      max={listing.remainingQty}
                      autoFocus
                    />
                    
                    <div className={styles.requestFormActions}>
                      <button 
                        className={styles.cancelBtn}
                        onClick={() => {
                          setRequestQty('');
                          setShowRequestForm(false);
                        }}
                      >
                        Cancel
                      </button>
                      <button 
                        className={styles.submitBtn}
                        onClick={handleRequestToBuy}
                        disabled={isSubmitting || !requestQty || Number(requestQty) <= 0}
                      >
                        {isSubmitting ? 'Sending...' : 'Send Request'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}