import { useState } from "react";
import { RiArrowLeftLine, RiStore3Line } from "react-icons/ri";
import { MdDeleteOutline } from "react-icons/md";
import { ConfirmModal } from "../../../components/ConfirmModal/ConfirmModal";
import { useToast } from "../../../context/ToastContext";
import { marketService } from "../../../services/marketService";
import { SectionRequests } from "./SectionRequests";
import { CROP_ICON, CROP_CSS } from "../constants";
import styles from "../BuyerSellerDashboard.module.css";
import type { Listing, Request } from "../../../services/marketService";

interface SectionMyStoreProps {
  listings: Listing[];
  onRefresh: () => void;
}

export function SectionMyStore({ listings, onRefresh }: SectionMyStoreProps) {
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    listingId: string | null;
  }>({ show: false, listingId: null });
  const { addToast } = useToast();

  const handleDeleteClick = (listingId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm({ show: true, listingId });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.listingId) return;

    const result = await marketService.deleteListing(deleteConfirm.listingId);

    if (result.success) {
      addToast("Listing deleted successfully!", "success");
      onRefresh();
      if (selectedListing?.id === deleteConfirm.listingId) {
        setSelectedListing(null);
      }
    } else {
      addToast(result.error || "Failed to delete listing", "error");
    }
    setDeleteConfirm({ show: false, listingId: null });
  };

  if (selectedListing) {
    return (
      <>
        <button className={styles.backBtn} onClick={() => setSelectedListing(null)}>
          <RiArrowLeftLine size={16} /> Back to My Listings
        </button>
        <SectionRequests
          requests={selectedListing.requests || []}
          onAccept={(r: Request) => {
            marketService.acceptRequest(r.id);
            onRefresh();
          }}
          onReject={(r: Request) => {
            marketService.rejectRequest(r.id);
            onRefresh();
          }}
        />
      </>
    );
  }

  if (listings.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <RiStore3Line size={48} />
        </div>
        <div className={styles.emptyTitle}>No listings yet</div>
        <div className={styles.emptyText}>
          Start selling by listing your produce.
        </div>
      </div>
    );
  }

  return (
    <>
      <ConfirmModal
        isOpen={deleteConfirm.show}
        title="Delete Listing"
        message="⚠️ WARNING: This action cannot be undone. Are you sure you want to permanently delete this listing?"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ show: false, listingId: null })}
      />

      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>My Store</div>
        <div className={styles.pageSubtitle}>
          {listings.length} active listings · Manage your produce
        </div>
      </div>

      <div className={styles.marketplaceGrid}>
        {listings.map((listing) => (
          <div key={listing.id} className={styles.marketplaceCard}>
            <div className={styles.cardPhoto}>
              {listing.photoUrl ? (
                <img src={listing.photoUrl} alt={listing.cropType} />
              ) : (
                <div className={styles.photoPlaceholder}>
                  <span className={styles.photoEmoji}>
                    {CROP_ICON[listing.cropType]}
                  </span>
                </div>
              )}
              <div className={`${styles.cardBadge} ${styles[CROP_CSS[listing.cropType]]}`}>
                {CROP_ICON[listing.cropType]} {listing.cropType}
              </div>
              <button
                className={styles.deleteListingBtn}
                onClick={(e) => handleDeleteClick(listing.id, e)}
                title="Delete listing"
              >
                <MdDeleteOutline size={18} />
              </button>
            </div>
            <div className={styles.cardInfo}>
              <div className={styles.produceStats}>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>
                    {listing.remainingQty}/{listing.quantity}kg
                  </span>
                  <span className={styles.statLabel}>Remaining</span>
                </div>
                <div className={styles.statDivider}>|</div>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>
                    {listing.requests?.filter((r) => r.status === "pending").length || 0}
                  </span>
                  <span className={styles.statLabel}>Pending</span>
                </div>
              </div>
              <button
                className={styles.viewRequestsBtn}
                onClick={() => setSelectedListing(listing)}
              >
                View Requests →
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}