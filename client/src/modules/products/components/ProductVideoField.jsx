import { useState } from "react";
import { Film, Trash2 } from "lucide-react";

const MAX_PRODUCT_VIDEOS = 3;
const MAX_PRODUCT_VIDEO_BYTES = 2 * 1024 * 1024;
const SUPPORTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const videoBytes = (video) => {
  if (!video.startsWith("data:")) return 0;
  return Math.floor(((video.split(",", 2)[1] || "").length * 3) / 4);
};

export default function ProductVideoField({ values = [], onChange, disabled }) {
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    setError("");

    if (files.length + values.length > MAX_PRODUCT_VIDEOS) {
      setError(`Choose up to ${MAX_PRODUCT_VIDEOS} product videos.`);
      return;
    }
    if (files.some((file) => !SUPPORTED_VIDEO_TYPES.includes(file.type))) {
      setError("Choose MP4, WebM, or MOV videos.");
      return;
    }
    if (files.some((file) => file.size > MAX_PRODUCT_VIDEO_BYTES)) {
      setError("Each product video must be 2 MB or smaller.");
      return;
    }
    const totalBytes = values.reduce((sum, video) => sum + videoBytes(video), 0)
      + files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > MAX_PRODUCT_VIDEO_BYTES) {
      setError("Product videos must be 2 MB or smaller in total. Compress the videos and try again.");
      return;
    }

    Promise.all(files.map((file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    })))
      .then((newVideos) => onChange([...values, ...newVideos]))
      .catch(() => setError("Could not read those videos. Please try again."));
  };

  return (
    <div className="product-video-field">
      <span className="product-image-label">Product videos</span>
      <small className="product-image-hint">Add up to {MAX_PRODUCT_VIDEOS} MP4, WebM, or MOV clips (2 MB total).</small>
      {values.length > 0 && <div className="product-video-gallery">
        {values.map((video, index) => <div className="product-video-thumb" key={`video-${index}`}>
          <video src={video} muted playsInline preload="metadata" />
          <span>Video {index + 1}</span>
          <button type="button" onClick={() => onChange(values.filter((_, videoIndex) => videoIndex !== index))} disabled={disabled} aria-label={`Remove product video ${index + 1}`}>
            <Trash2 size={14} />
          </button>
        </div>)}
      </div>}
      <label className="button button-secondary product-image-choose" htmlFor="product-videos-input" aria-disabled={disabled || values.length >= MAX_PRODUCT_VIDEOS}>
        <Film size={15} /> Choose videos
      </label>
      <input
        id="product-videos-input"
        className="sr-only"
        type="file"
        multiple
        accept="video/mp4,video/webm,video/quicktime,.mov"
        onChange={handleChange}
        disabled={disabled || values.length >= MAX_PRODUCT_VIDEOS}
      />
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}
