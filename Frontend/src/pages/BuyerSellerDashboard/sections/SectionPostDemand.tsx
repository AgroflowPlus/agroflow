import { useState } from "react";
import { BsArrowRight } from "react-icons/bs";
import { RiSeedlingLine } from "react-icons/ri";
import { useToast } from "../../../context/ToastContext";
import { CustomSelect } from "../../../components/CustomSelect/CustomSelect";
import { marketService, AKURE_AREAS, type CropType } from "../../../services/marketService";
import { CROPS } from "../constants";
import styles from "../BuyerSellerDashboard.module.css";

interface SectionPostDemandProps {
  user: any;
  onResult: (r: any) => void;
}

export function SectionPostDemand({ onResult }: SectionPostDemandProps) {
  const [form, setForm] = useState({
    cropType: "Maize" as CropType,
    quantity: "",
    location: AKURE_AREAS[0],
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { addToast } = useToast();

  const setF = (k: string, v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.quantity || Number(form.quantity) <= 0) {
      e.quantity = "Enter a valid quantity";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    const result = await marketService.postDemand({
      cropType: form.cropType,
      quantity: Number(form.quantity),
      location: form.location,
    });

    setLoading(false);

    if (result.matched) {
      addToast("Match found! Check your matches section.", "success");
    } else {
      addToast("Added to waitlist. We'll notify you when a seller is found.", "info");
    }

    onResult(result);
  };

  return (
    <div className={styles.formCard}>
      <div className={styles.formTitle}>Post a Demand</div>
      <div className={styles.formSubtitle}>
        Tell us what you need. Our system will find the closest seller in Akure.
      </div>
      <form onSubmit={handleSubmit} noValidate>
        <div className={styles.formFields}>
          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Crop Type</label>
              <CustomSelect
                options={CROPS.map((crop) => ({ value: crop, label: crop }))}
                value={form.cropType}
                onChange={(value) => setF("cropType", value)}
                placeholder="Select crop type"
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Your Location (Akure)</label>
              <CustomSelect
                options={AKURE_AREAS.map((area) => ({ value: area, label: area }))}
                value={form.location}
                onChange={(value) => setF("location", value)}
                placeholder="Select location"
              />
            </div>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Quantity Needed (kg)</label>
            <input
              className={styles.fieldInput}
              type="number"
              placeholder="e.g. 200"
              min={1}
              value={form.quantity}
              onChange={(e) => setF("quantity", e.target.value)}
            />
            {errors.quantity && (
              <span className={styles.fieldErrMsg}>{errors.quantity}</span>
            )}
          </div>
          <div
            style={{
              background: "#f2f9e4",
              border: "1px solid rgba(168,216,50,0.3)",
              borderRadius: 10,
              padding: "12px 14px",
              fontSize: 13,
              color: "#2d6a35",
              fontWeight: 600,
            }}
          >
            <RiSeedlingLine size={16} style={{ display: "inline", marginRight: 8 }} />
            Our system will check available sellers in Akure and match you by closest location first.
          </div>
          <button className={styles.formSubmitBtn} type="submit" disabled={loading}>
            {loading ? (
              <> Finding matches...</>
            ) : (
              <>
                Find a Match <BsArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}