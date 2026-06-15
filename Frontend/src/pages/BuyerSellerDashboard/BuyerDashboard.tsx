import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  RiLeafFill,
  RiCheckboxCircleLine,
  RiUserLine,
  RiSettings4Line,
  RiLogoutBoxRLine,
  RiStore3Line,
  RiTimeLine,
  RiCheckDoubleLine,
  RiBellLine,
  RiShoppingCartLine,
  RiSendPlaneLine,
  RiMailSendLine,
  RiHomeSmileLine,
  RiRobot2Fill,
} from "react-icons/ri";
import { MdOutlineMenu, MdClose } from "react-icons/md";
import { FaSeedling } from "react-icons/fa";
import {
  marketService,
  type Listing,
  type Demand,
  type Match,
  type Notification,
  type CropType,
} from "../../services/marketService";
import { authService } from "../../services/authService";
import { useToast } from "../../context/ToastContext";
import { ConfirmModal } from "../../components/ConfirmModal/ConfirmModal";
import { ListingDetailModal } from "../../components/ListingDetailModal/ListingDetailModal";
import { SectionMarketplace } from "../BuyerSellerDashboard/sections/SectionMarketplace";
import { SectionMatches } from "../BuyerSellerDashboard/sections/SectionMatches";
import { SectionWaitlist } from "../BuyerSellerDashboard/sections/SectionWaitlist";
import { SectionNotifications } from "../BuyerSellerDashboard/sections/SectionNotifications";
import { SectionSettings } from "../BuyerSellerDashboard/sections/SectionSettings";
import { SectionPostDemand } from "../BuyerSellerDashboard/sections/SectionPostDemand";
import { ListingCard } from "../BuyerSellerDashboard/components/ListingCard";
import { CROP_ICON } from "../BuyerSellerDashboard/constants";
import styles from "./BuyerSellerDashboard.module.css";

type Section =
  | "marketplace"
  | "buy"
  | "matches"
  | "waitlist"
  | "notifications"
  | "settings";

export default function BuyerDashboard() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [user, setUser] = useState(
    authService.getUser() ?? {
      id: "mock-001",
      name: "Buyer User",
      email: "buyer@test.com",
      role: "buyer",
      phone: "+234 801 234 5678",
      location: "Ijapo Estate, Akure",
      avatar: null,
    },
  );

  const initials =
    user.name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase() ?? "BU";
  const [section, setSection] = useState<Section>("marketplace");
  const [sidebarOpen, setSidebar] = useState(false);
  const [cropFilter, setCropFilter] = useState<CropType | "All">("All");
  const [listings, setListings] = useState<Listing[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [waitlist, setWaitlist] = useState<Demand[]>([]);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showRequestModal, setShowRequestModal] = useState<{
    listing: Listing;
  } | null>(null);
  const [requestQty, setRequestQty] = useState("");
  const [requestMsg, setRequestMsg] = useState("");
  const [modal, setModal] = useState<null | {
    type: "match" | "waitlist" | "requestSent";
    data: any;
  }>(null);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    type: "delete" | "accept" | "reject";
    data?: any;
  }>({ show: false, type: "delete" });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

// AI Recommendations State
const [aiRecommendations, setAIRecommendations] = useState<any[]>([]);
const [showAIRecommendations, setShowAIRecommendations] = useState(true);
const [showAllRecommendations, setShowAllRecommendations] = useState(false);
const [isMobile, setIsMobile] = useState<boolean>(false);

useEffect(() => {
  const check = (): void => setIsMobile(window.innerWidth <= 768);
  check();
  window.addEventListener("resize", check);
  return () => window.removeEventListener("resize", check);
}, []);
  
  useEffect(() => {
    refresh();
    loadAIRecommendations();
  }, []);

  async function refresh() {
    try {
      const [listingsData, matchesData, waitlistData] = await Promise.all([
        marketService.getListings(user.location),
        marketService.getMatches(),
        marketService.getWaitlist(),
      ]);
      setListings(listingsData);
      setMatches(matchesData);
      setWaitlist(waitlistData);
      setNotifs(marketService.getNotifications(user.id));
    } catch (err) {
      console.error("Refresh error:", err);
      addToast("Failed to refresh data", "error");
    }
  }

  const loadAIRecommendations = async () => {
    try {
      const recommendations = await marketService.getAIRecommendations();
      if (recommendations && recommendations.length > 0) {
        setAIRecommendations(recommendations);
      }
    } catch (error) {
      console.error("Error loading recommendations:", error);
    }
  };

  const unread = notifs.filter((n) => !n.read).length;

  const handleRequestToBuy = (listing: Listing) => {
    setShowRequestModal({ listing });
    setRequestQty("");
    setRequestMsg("");
  };

  const handleListingClick = (listing: Listing) => {
    setSelectedListing(listing);
  };

  const submitRequest = async () => {
    const qty = Number(requestQty);
    if (!showRequestModal) return;
    if (qty <= 0 || qty > showRequestModal.listing.remainingQty) {
      addToast(
        `Please enter a valid quantity (max ${showRequestModal.listing.remainingQty}kg)`,
        "error",
      );
      return;
    }
    const result = await marketService.createRequest(
      showRequestModal.listing.id,
      qty,
      requestMsg ||
        `I would like to buy ${qty}kg of your ${showRequestModal.listing.cropType}`,
      user.location || "Ijapo Estate",
    );
    if (!result.success) {
      addToast(result.error || "Failed to send request", "error");
      return;
    }
    setShowRequestModal(null);
    setModal({ type: "requestSent", data: result.request });
    refresh();
    addToast("Request sent successfully!", "success");
  };

  const handleLogout = () => setShowLogoutConfirm(true);
  const confirmLogout = () => {
    authService.clearSession();
    navigate("/login");
    addToast("Logged out successfully", "success");
  };

  const filteredListings = listings.filter(
    (l) =>
      (cropFilter === "All" || l.cropType === cropFilter) &&
      l.status !== "sold",
  );

  // Convert AI recommendations to Listing format for ListingCard
  const aiListings: Listing[] = aiRecommendations.map((rec) => ({
    id: rec.listingId,
    sellerId: rec.sellerId,
    sellerName: rec.sellerName,
    sellerEmail: "",
    sellerPhone: "",
    cropType: rec.cropType,
    quantity: rec.quantity,
    remainingQty: rec.quantity,
    location: rec.location,
    description: "",
    photoUrl: undefined,
    status: "available",
    createdAt: new Date().toISOString(),
    distance: rec.distance,
  }));

  const initialCount: number = isMobile ? 2 : 3;

  const sidebarNavItems: {
    id: Section;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      id: "marketplace",
      label: "Marketplace",
      icon: <RiStore3Line size={17} />,
    },
    { id: "buy", label: "Post Demand", icon: <FaSeedling size={15} /> },
    {
      id: "matches",
      label: "My Matches",
      icon: <RiCheckDoubleLine size={16} />,
      badge: matches.length,
    },
    {
      id: "waitlist",
      label: "Waitlist",
      icon: <RiTimeLine size={15} />,
      badge: waitlist.length,
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: <RiBellLine size={15} />,
      badge: unread,
    },
    { id: "settings", label: "Settings", icon: <RiSettings4Line size={17} /> },
  ];

  const bottomNavItems: {
    id: Section;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    { id: "marketplace", label: "Home", icon: <RiHomeSmileLine size={22} /> },
    {
      id: "matches",
      label: "Matches",
      icon: <RiCheckDoubleLine size={20} />,
      badge: matches.length,
    },
    {
      id: "waitlist",
      label: "Waitlist",
      icon: <RiTimeLine size={20} />,
      badge: waitlist.length,
    },
    { id: "settings", label: "Settings", icon: <RiSettings4Line size={20} /> },
  ];

  const visibleRecommendations = showAllRecommendations
    ? aiListings
    : aiListings.slice(0, initialCount);

  return (
    <div className={styles.shell}>
      <ConfirmModal
        isOpen={confirmModal.show}
        title="Confirm"
        message="Are you sure?"
        onConfirm={() => {
          setConfirmModal({ show: false, type: "delete" });
          refresh();
        }}
        onCancel={() => setConfirmModal({ show: false, type: "delete" })}
      />

      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Logout"
        message="Are you sure you want to log out?"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      <div
        className={`${styles.overlay} ${sidebarOpen ? styles.overlayVisible : ""}`}
        onClick={() => setSidebar(false)}
      />

      {/* Request Modal */}
      {showRequestModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowRequestModal(null)}
        >
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 500 }}
          >
            <div className={styles.modalIcon} style={{ background: "#f2f9e4" }}>
              <RiSendPlaneLine size={32} color="#2d6a35" />
            </div>
            <div className={styles.modalTitle}>Request to Buy</div>
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginBottom: 16,
                  padding: 12,
                  background: "#f7f8f5",
                  borderRadius: 12,
                }}
              >
                {showRequestModal.listing.photoUrl ? (
                  <img
                    src={showRequestModal.listing.photoUrl}
                    alt=""
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 8,
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 8,
                      background: "#e2e8df",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {CROP_ICON[showRequestModal.listing.cropType]}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 800, marginBottom: 4 }}>
                    {showRequestModal.listing.cropType}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7f6e" }}>
                    Seller: {showRequestModal.listing.sellerName}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7f6e" }}>
                    Available: {showRequestModal.listing.remainingQty}kg
                  </div>
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  Quantity Needed (kg) *
                </label>
                <input
                  type="number"
                  className={styles.fieldInput}
                  value={requestQty}
                  onChange={(e) => setRequestQty(e.target.value)}
                  min={1}
                  max={showRequestModal.listing.remainingQty}
                  placeholder={`Max ${showRequestModal.listing.remainingQty}kg`}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  Message to Seller (Optional)
                </label>
                <textarea
                  className={styles.fieldTextarea}
                  rows={3}
                  value={requestMsg}
                  onChange={(e) => setRequestMsg(e.target.value)}
                  placeholder="e.g., When can I pick up? Do you deliver?"
                />
              </div>
            </div>
            <div className={styles.modalBtns}>
              <button
                className={styles.modalBtnPrimary}
                onClick={submitRequest}
              >
                <RiMailSendLine size={16} /> Send Request
              </button>
              <button
                className={styles.modalBtnOutline}
                onClick={() => setShowRequestModal(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Modal */}
      {modal && (
        <div
          className={styles.modalOverlay}
          onClick={() => {
            setModal(null);
            refresh();
          }}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div
              className={`${styles.modalIcon} ${modal.type === "match" || modal.type === "requestSent" ? styles.modalIconSuccess : styles.modalIconWait}`}
            >
              {modal.type === "requestSent" ? (
                <RiMailSendLine size={32} />
              ) : modal.type === "match" ? (
                <RiCheckboxCircleLine size={32} />
              ) : (
                <RiTimeLine size={32} />
              )}
            </div>
            <div className={styles.modalTitle}>
              {modal.type === "requestSent"
                ? "Request Sent!"
                : modal.type === "match"
                  ? "Match Found!"
                  : "Added to Waitlist"}
            </div>
            <div className={styles.modalText}>
              {modal.type === "requestSent"
                ? `Your request has been sent to the seller.`
                : modal.type === "match"
                  ? `Great news! We found matches for your demand.`
                  : `No sellers available right now. We'll notify you when someone lists matching produce.`}
            </div>
            <div className={styles.modalBtns}>
              <button
                className={styles.modalBtnPrimary}
                onClick={() => {
                  setModal(null);
                  refresh();
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Listing Detail Modal */}
      {selectedListing && (
        <ListingDetailModal
          listing={selectedListing}
          isOpen={!!selectedListing}
          onClose={() => setSelectedListing(null)}
          onRequestToBuy={handleRequestToBuy}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}
      >
        <div className={styles.sidebarTop}>
          <div className={styles.logoRow}>
            <div className={styles.logoMark}>
              <RiLeafFill size={16} />
            </div>
            <span className={styles.logoText}>
              AgroFlow<span>+</span>
            </span>
          </div>
          <div className={styles.profileRow}>
            <div className={styles.profileAvatar}>{initials}</div>
            <div className={styles.profileInfo}>
              <div className={styles.profileName}>{user.name}</div>
              <div className={styles.profileRole}>
                <RiShoppingCartLine size={10} /> Buyer
              </div>
            </div>
          </div>
        </div>
        <nav className={styles.sidebarNav}>
          <div className={styles.navLabel}>NAVIGATION</div>
          {sidebarNavItems.map((item) => (
            <button
              key={item.id}
              className={`${styles.navItem} ${section === item.id ? styles.navItemActive : ""}`}
              onClick={() => {
                setSection(item.id);
                setSidebar(false);
              }}
            >
              <div className={styles.navIcon}>{item.icon}</div>
              <span className={styles.navText}>{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className={styles.navBadgeGreen}>{item.badge}</span>
              )}
            </button>
          ))}
        </nav>
        <div className={styles.sidebarBottom}>
          <button
            className={styles.sidebarBtn}
            onClick={() => {
              setSection("settings");
              setSidebar(false);
            }}
          >
            <RiSettings4Line size={15} /> Settings
          </button>
          <button
            className={`${styles.sidebarBtn} ${styles.sidebarBtnDanger}`}
            onClick={handleLogout}
          >
            <RiLogoutBoxRLine size={15} /> Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={styles.main}>
        <div className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button
              className={styles.menuBtn}
              onClick={() => setSidebar((p) => !p)}
            >
              {sidebarOpen ? (
                <MdClose size={17} />
              ) : (
                <MdOutlineMenu size={17} />
              )}
            </button>
            <div className={styles.roleBadge}>
              <span className={styles.buyerBadge}>Buyer Mode</span>
            </div>
          </div>
          <div style={{ width: 40 }}></div>
          <div className={styles.topbarRight}>
            <button
              className={styles.topbarIconBtn}
              onClick={() => setSection("notifications")}
            >
              <RiBellLine size={15} />
              {unread > 0 && <div className={styles.notifBadge} />}
            </button>
            <div className={styles.topbarIconBtn}>
              <RiUserLine size={15} />
            </div>
          </div>
        </div>

        <div className={styles.content}>
          {section === "marketplace" && (
            <>
  {/* AI RECOMMENDATIONS SECTION */}
  {showAIRecommendations && aiListings.length > 0 && (
    <div className={styles.aiRecommendationsSection}>
      <div className={styles.aiSectionHeader}>
        <div className={styles.aiHeaderLeft}>
          <div className={styles.aiIcon}>
            <RiRobot2Fill size={28} color="#2d6a35" />
          </div>
          <div>
            <h3 className={styles.aiTitle}>
              AI-Powered Recommendations
            </h3>
            <p className={styles.aiSubtitle}>
              {aiRecommendations.length > 0 &&
              aiRecommendations[0]?.isNewUserRecommendation
                ? `Based on your location in ${user.location || "Akure"}`
                : `Based on your purchase history and preferences`}
            </p>
          </div>
        </div>
        <button
          className={styles.aiDismissBtn}
          onClick={() => setShowAIRecommendations(false)}
        >
          ✕
        </button>
      </div>

      {/* Cards */}
      <div className={styles.marketplaceGrid}>
        {visibleRecommendations.map((listing, index) => {
          const rec = aiRecommendations[index];
          return (
            <div key={listing.id} className={styles.aiCardWrapper}>
              {rec && (
                <>
                  <div className={styles.aiScoreBadge}>
                    {rec.score}% Match
                  </div>
                  <div className={styles.aiImageOverlay}>
                    <div className={styles.aiReasons}>
                      {rec.reasons
                        ?.slice(0, 2)
                        .map((reason: string, idx: number) => (
                          <span key={idx} className={styles.aiReason}>
                            ✓ {reason}
                          </span>
                        ))}
                    </div>
                  </div>
                </>
              )}
              <ListingCard
                listing={listing}
                intent="buy"
                onRequestToBuy={handleRequestToBuy}
                onClick={handleListingClick}
              />
            </div>
          );
        })}
      </div>

      {/* Show More / Show Less */}
      {aiListings.length > initialCount && (
        <div className={styles.showMoreContainer}>
          <button
            className={styles.showMoreBtn}
            onClick={() => setShowAllRecommendations(!showAllRecommendations)}
          >
            {showAllRecommendations
              ? "Show Less ↑"
              : `Show More (${aiListings.length - initialCount} more) ↓`}
          </button>
        </div>
      )}
    </div>
  )}

  {/* Regular Marketplace */}
  <SectionMarketplace
    listings={filteredListings}
    cropFilter={cropFilter}
    setCropFilter={setCropFilter}
    intent="buy"
    onRequestToBuy={handleRequestToBuy}
    onListingClick={handleListingClick}
  />
</>
          )}

          {section === "buy" && (
            <SectionPostDemand
              user={user}
              onResult={(r) => {
                refresh();
                setModal({ type: r.matched ? "match" : "waitlist", data: r });
              }}
            />
          )}

          {section === "matches" && (
            <SectionMatches matches={matches} userId={user.id} />
          )}

          {section === "waitlist" && <SectionWaitlist waitlist={waitlist} />}

          {section === "notifications" && (
            <SectionNotifications
              notifs={notifs}
              onMarkAll={() => {
                marketService.markAllRead(user.id);
                refresh();
                addToast("All notifications marked as read", "info");
              }}
            />
          )}

          {section === "settings" && (
            <SectionSettings
              user={user}
              onUpdate={(updatedUser) => {
                setUser(updatedUser);
                refresh();
                addToast("Profile updated successfully!", "success");
              }}
            />
          )}
        </div>

        <div className={styles.bottomNav}>
          <div className={styles.bottomNavItems}>
            {bottomNavItems.map((item) => (
              <button
                key={item.id}
                className={`${styles.bottomNavItem} ${section === item.id ? styles.bottomNavItemActive : ""}`}
                onClick={() => setSection(item.id)}
              >
                <div className={styles.bottomNavIcon}>
                  {item.icon}
                  {item.badge && item.badge > 0 && (
                    <span className={styles.bottomNavBadge}>
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </div>
                <span className={styles.bottomNavLabel}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
