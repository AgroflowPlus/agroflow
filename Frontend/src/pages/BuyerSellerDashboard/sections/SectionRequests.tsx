import { useState } from "react";
import { RiChatCheckLine, RiShoppingBagLine, RiTimeLine } from "react-icons/ri";
import { MdCheckCircle, MdCancel } from "react-icons/md";
import { timeAgo } from "../constants";
import { LoadingButton } from "../../../components/LoadingButton/LoadingButton";
import styles from "../BuyerSellerDashboard.module.css";
import type { Request } from "../../../services/marketService";

interface SectionRequestsProps {
  requests: Request[];
  onAccept: (r: Request) => void;
  onReject: (r: Request) => void;
}

export function SectionRequests({ requests, onAccept, onReject }: SectionRequestsProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAccept = async (req: Request) => {
    setProcessingId(req.id);
    try {
      await onAccept(req);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (req: Request) => {
    setProcessingId(req.id);
    try {
      await onReject(req);
    } finally {
      setProcessingId(null);
    }
  };

  if (requests.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <RiChatCheckLine size={48} />
        </div>
        <div className={styles.emptyTitle}>No requests yet</div>
        <div className={styles.emptyText}>
          When buyers request your produce, they'll appear here.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.requestsList}>
      {requests.map((req) => {
        const isProcessing = processingId === req.id;
        
        return (
          <div key={req.id} className={styles.requestCard}>
            <div className={styles.requestHeader}>
              <div className={styles.requestBuyer}>{req.buyerName}</div>
              <div
                className={`${styles.requestStatus} ${
                  req.status === "pending"
                    ? styles.statusPending
                    : req.status === "accepted"
                    ? styles.statusAccepted
                    : styles.statusRejected
                }`}
              >
                {req.status}
              </div>
            </div>
            <div className={styles.requestDetails}>
              <div>
                <RiShoppingBagLine size={12} /> {req.requestedQty}kg
              </div>
              <div>
                <RiTimeLine size={12} /> {timeAgo(req.createdAt)}
              </div>
            </div>
            {req.message && (
              <div className={styles.requestMessage}>
                <RiChatCheckLine size={12} /> "{req.message}"
              </div>
            )}
            {req.status === "pending" && (
              <div className={styles.requestActions}>
                <LoadingButton
                  loading={isProcessing}
                  className={styles.acceptBtn}
                  onClick={() => handleAccept(req)}
                  disabled={isProcessing}
                >
                  <MdCheckCircle size={16} /> Accept
                </LoadingButton>
                <LoadingButton
                  loading={isProcessing}
                  className={styles.rejectBtn}
                  onClick={() => handleReject(req)}
                  disabled={isProcessing}
                >
                  <MdCancel size={16} /> Decline
                </LoadingButton>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}