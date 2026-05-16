import { useState, useRef } from "react";
import { RiImageAddLine } from "react-icons/ri";
import { MdCameraAlt } from "react-icons/md";
import { BsArrowRight } from "react-icons/bs";
import { useToast } from "../../../context/ToastContext";
import { CustomSelect } from "../../../components/CustomSelect/CustomSelect";
import { marketService, AKURE_AREAS, type CropType } from "../../../services/marketService";
import { CROPS } from "../constants";
import styles from "../BuyerSellerDashboard.module.css";

interface SectionPostListingProps {
  user: any;
  onSuccess: () => void;
}

export function SectionPostListing({ onSuccess }: SectionPostListingProps) {
  const [form, setForm] = useState({
    cropType: "Maize" as CropType,
    quantity: "",
    location: AKURE_AREAS[0],
    description: "",
    photoUrl: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imagePreview, setImagePreview] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  const setF = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        addToast("Image is too large. Please choose an image under 5MB.", "error");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const b = reader.result as string;
        setImagePreview(b);
        setF("photoUrl", b);
      };
      reader.readAsDataURL(file);
    }
  };

  const takePhoto = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const b = reader.result as string;
          setImagePreview(b);
          setF("photoUrl", b);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.quantity || Number(form.quantity) <= 0)
      e.quantity = "Enter a valid quantity";
    if (!form.description.trim()) e.description = "Add a short description";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    const result = await marketService.postListing({
      cropType: form.cropType,
      quantity: Number(form.quantity),
      location: form.location,
      description: form.description,
      photoUrl: form.photoUrl || undefined,
    });

    if (!result.success) {
      addToast(result.error || "Failed to post listing", "error");
      setLoading(false);
      return;
    }
    setLoading(false);
    onSuccess();
  };

  return (
    <div className={styles.formCard}>
      <div className={styles.formTitle}>List Your Produce</div>
      <div className={styles.formSubtitle}>
        Post what you have available. Buyers in Akure will see it instantly.
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
              <label className={styles.fieldLabel}>Location (Akure)</label>
              <CustomSelect
                options={AKURE_AREAS.map((area) => ({ value: area, label: area }))}
                value={form.location}
                onChange={(value) => setF("location", value)}
                placeholder="Select location"
              />
            </div>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Available Quantity (kg)</label>
            <input
              className={styles.fieldInput}
              type="number"
              placeholder="e.g. 500"
              min={1}
              value={form.quantity}
              onChange={(e) => setF("quantity", e.target.value)}
            />
            {errors.quantity && (
              <span className={styles.fieldErrMsg}>{errors.quantity}</span>
            )}
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Product Photo</label>
            <div className={styles.photoUploadArea}>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 12 }}>
                <button
                  type="button"
                  className={styles.photoUploadBtn}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <RiImageAddLine size={20} /> Choose from Gallery
                </button>
                <button type="button" className={styles.photoUploadBtn} onClick={takePhoto}>
                  <MdCameraAlt size={18} /> Take Photo
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleImageSelect}
              />
              <div style={{ fontSize: 12, color: "#9ead9f", textAlign: "center" }}>
                Upload a clear photo of your produce (max 5MB)
              </div>
              {imagePreview && (
                <div className={styles.imagePreviewContainer}>
                  <img src={imagePreview} className={styles.photoPreview} alt="Preview" />
                  <button
                    type="button"
                    className={styles.removePhotoBtn}
                    onClick={() => {
                      setImagePreview("");
                      setF("photoUrl", "");
                    }}
                  >
                    ✕ Remove
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Description</label>
            <textarea
              className={styles.fieldTextarea}
              placeholder="Describe your produce — quality, harvest date, packaging..."
              value={form.description}
              onChange={(e) => setF("description", e.target.value)}
            />
            {errors.description && (
              <span className={styles.fieldErrMsg}>{errors.description}</span>
            )}
          </div>
          <button className={styles.formSubmitBtn} type="submit" disabled={loading}>
            {loading ? (
              <> Posting...</>
            ) : (
              <>
                Post Listing <BsArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}