import { RiChatCheckLine, RiShoppingBagLine, RiTimeLine } from "react-icons/ri";
import { MdCheckCircle, MdCancel } from "react-icons/md";
import { timeAgo } from "../constants";
import styles from "../BuyerSellerDashboard.module.css";
import type { Request } from "../../../services/marketService";

interface SectionRequestsProps {
  requests: Request[];
  onAccept: (r: Request) => void;
  onReject: (r: Request) => void;
}

export function SectionRequests({ requests, onAccept, onReject }: SectionRequestsProps) {
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
      {requests.map((req) => (
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
              <button className={styles.acceptBtn} onClick={() => onAccept(req)}>
                <MdCheckCircle size={16} /> Accept
              </button>
              <button className={styles.rejectBtn} onClick={() => onReject(req)}>
                <MdCancel size={16} /> Decline
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}