import { useState } from "react";
import { RiMore2Fill, RiStore3Line } from "react-icons/ri";
import { MdDeleteOutline } from "react-icons/md";
import { ListingCard } from "../components/ListingCard";
import { SectionRequests } from "./SectionRequests";
import { ConfirmModal } from "../../../components/ConfirmModal/ConfirmModal";
import { useToast } from "../../../context/ToastContext";
import { marketService, type Listing, type Request } from "../../../services/marketService";
import styles from "../BuyerSellerDashboard.module.css";

interface SectionMyStoreProps {
  listings: Listing[];
  onRefresh: () => void;
}

export function SectionMyStore({ listings, onRefresh }: SectionMyStoreProps) {
  const { addToast } = useToast();
  const [showRequests, setShowRequests] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (listingId: string) => {
    setIsDeleting(true);
    try {
      const result = await marketService.deleteListing(listingId);
      if (result.success) {
        addToast("Listing deleted successfully", "success");
        onRefresh();
      } else {
        addToast(result.error || "Failed to delete listing", "error");
      }
    } catch (error) {
      addToast("An error occurred while deleting", "error");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  // ── FIX: Make these async functions that return Promise ──────────
  const handleAcceptRequest = async (request: Request) => {
    try {
      const result = await marketService.acceptRequest(request.id);
      if (result.success) {
        addToast("Request accepted successfully!", "success");
        onRefresh();
      } else {
        addToast(result.error || "Failed to accept request", "error");
      }
    } catch (error) {
      addToast("An error occurred while accepting the request", "error");
    }
  };

  const handleRejectRequest = async (request: Request) => {
    try {
      await marketService.rejectRequest(request.id);
      addToast("Request declined", "info");
      onRefresh();
    } catch (error) {
      addToast("Failed to decline request", "error");
    }
  };

  // Extract all requests from listings
  const allRequests = listings.flatMap((l) => l.requests || []);

  return (
    <div className={styles.myStoreContainer}>
      {/* Header */}
      <div className={styles.myStoreHeader}>
        <div>
          <h2 className={styles.myStoreTitle}>My Store</h2>
          <p className={styles.myStoreSubtitle}>
            {listings.length} active listing{listings.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className={styles.myStoreActions}>
          {allRequests.length > 0 && (
            <button
              className={`${styles.requestToggleBtn} ${showRequests ? styles.requestToggleBtnActive : ""}`}
              onClick={() => setShowRequests(!showRequests)}
            >
              <RiMore2Fill size={16} />
              {showRequests ? "Hide Requests" : `Requests (${allRequests.length})`}
            </button>
          )}
        </div>
      </div>

      {/* Requests Section */}
      {showRequests && (
        <div className={styles.requestsSection}>
          <SectionRequests
            requests={allRequests}
            onAccept={handleAcceptRequest}
            onReject={handleRejectRequest}
          />
        </div>
      )}

      {/* Listings Grid */}
      {listings.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <RiStore3Line size={48} color="#9ead9f" />
          </div>
          <div className={styles.emptyTitle}>No listings yet</div>
          <div className={styles.emptyText}>
            Start selling by posting your first produce listing.
          </div>
        </div>
      ) : (
        <div className={styles.marketplaceGrid}>
          {listings.map((listing) => (
            <div key={listing.id} className={styles.listingCardWrapper}>
              <ListingCard
                listing={listing}
                intent="sell"
                onRequestToBuy={() => {}}
              />
              <button
                className={styles.deleteListingBtn}
                onClick={() => setDeleteTarget(listing.id)}
                disabled={isDeleting}
                aria-label="Delete listing"
              >
                <MdDeleteOutline size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Listing"
        message="Are you sure you want to delete this listing? This action cannot be undone."
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}