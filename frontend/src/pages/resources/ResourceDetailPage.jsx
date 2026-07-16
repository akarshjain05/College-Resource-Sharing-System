import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Star, MapPin, Package, Shield, Trash2, Edit3, Image as ImageIcon, Loader2 } from "lucide-react";
import { resourceApi, borrowApi, reviewApi, uploadApi, categoryApi, getImageUrl } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";

export default function ResourceDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [resource, _setResource] = useState(null);
  const setResource = (data) => {
    if (data && data.images) {
      // Sort images chronologically by upload date so that they don't shuffle
      data.images = [...data.images].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );
    }
    _setResource(data);
  };
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  
  // Borrow form state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [purpose, setPurpose] = useState("");
  const [submittingBorrow, setSubmittingBorrow] = useState(false);

  // Edit form state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    category_id: "",
    condition: "good",
    quantity: 1,
    pickup_location: "",
    tags: "",
    deposit_amount: 0,
    max_borrow_days: 7,
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Image upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  // Tracks which image is displayed in the hero gallery (ID-based, local-only)
  const [activeImageId, setActiveImageId] = useState(null);
  // Tracks which image is being set as primary
  const [settingPrimaryId, setSettingPrimaryId] = useState(null);

  // Review states
  const [isEligibleToReview, setIsEligibleToReview] = useState(false);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([resourceApi.get(id), reviewApi.listForResource(id)])
      .then(([resResp, revResp]) => {
        setResource(resResp.data);
        setReviews(revResp.data);
      })
      .catch((err) => {
        toast.error("Could not load resource details.");
        navigate("/resources");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    categoryApi.list().then(({ data }) => setCategories(data)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Check review eligibility
  useEffect(() => {
    if (user && resource && resource.owner.id !== user.id) {
      borrowApi.myRequests()
        .then(({ data }) => {
          const mySuccessfulBorrows = data.filter(
            (req) => req.resource.id === resource.id && (req.status === "returned" || req.status === "damaged")
          );
          const myReviewsCount = reviews.filter((r) => r.reviewer.id === user.id).length;
          setIsEligibleToReview(mySuccessfulBorrows.length > myReviewsCount);
        })
        .catch(() => {});
    } else {
      setIsEligibleToReview(false);
    }
  }, [user, resource, reviews]);

  const handleBorrowRequest = async (e) => {
    e.preventDefault();
    setSubmittingBorrow(true);
    try {
      await borrowApi.create({
        resource_id: id,
        requested_start_date: startDate,
        requested_end_date: endDate,
        purpose,
      });
      toast.success("Borrow request sent to the owner!");
      navigate("/borrow-requests");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not send request.");
    } finally {
      setSubmittingBorrow(false);
    }
  };

  const startEditing = () => {
    if (!resource) return;
    setEditForm({
      title: resource.title,
      description: resource.description,
      category_id: resource.category.id,
      condition: resource.condition,
      quantity: resource.quantity,
      pickup_location: resource.pickup_location || "",
      tags: resource.tags || "",
      deposit_amount: resource.deposit_amount || 0,
      max_borrow_days: resource.max_borrow_days || 7,
    });
    setIsEditing(true);
  };

  const updateEditField = (field) => (e) => {
    const value = e.target.type === "number" ? Number(e.target.value) : e.target.value;
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (editForm.deposit_amount < 0) {
      toast.error("Deposit amount must be greater than or equal to 0.");
      return;
    }
    setSubmittingEdit(true);
    try {
      const { data } = await resourceApi.update(id, editForm);
      toast.success("Resource updated successfully!");
      setResource(data);
      setIsEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not update resource.");
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteListing = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this listing? This action cannot be undone.")) return;
    try {
      await resourceApi.remove(id);
      toast.success("Listing deleted successfully.");
      navigate("/resources");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not delete listing.");
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      // If no images exist yet, force the new image to be primary
      const shouldBePrimary = resource.images?.length === 0;
      await uploadApi.uploadResourceImage(id, file, shouldBePrimary);
      toast.success("Image uploaded!");
      // Reload resource
      const resResp = await resourceApi.get(id);
      setResource(resResp.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not upload image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (!window.confirm("Are you sure you want to delete this image?")) return;
    try {
      await uploadApi.deleteResourceImage(imageId);
      toast.success("Image deleted!");
      // Reload resource
      const resResp = await resourceApi.get(id);
      setResource(resResp.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not delete image.");
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      await reviewApi.create({
        resource_id: id,
        rating: newReviewRating,
        comment: newReviewComment || undefined,
      });
      toast.success("Review submitted!");
      setNewReviewComment("");
      setNewReviewRating(5);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm("Delete this review permanently? This cannot be undone.")) return;
    try {
      await reviewApi.delete(reviewId);
      toast.success("Review deleted.");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not delete review.");
    }
  };

  if (loading || !resource) {
    return <div className="h-96 animate-pulse rounded-lg bg-ink-100" />;
  }

  const isOwner = resource.owner.id === user?.id;
  const isAdmin = user?.role === "admin";
  const primaryImage = resource.images?.find((img) => img.is_primary) || resource.images?.[0];
  // The hero shows the thumbnail the user last clicked, or defaults to the primary
  const displayImage = resource.images?.find((img) => img.id === activeImageId) || primaryImage;

  const handleSetPrimary = async (imageId) => {
    setSettingPrimaryId(imageId);
    try {
      await uploadApi.setPrimaryImage(imageId);
      toast.success("Primary photo updated!");
      setActiveImageId(imageId);
      const resResp = await resourceApi.get(id);
      setResource(resResp.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not set primary image.");
    } finally {
      setSettingPrimaryId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        {/* Resource Image Display */}
        {resource.images?.length > 0 ? (
          <div className="space-y-3">
            {/* Hero image — aspect-ratio constrained, no stretching */}
            <div className="relative w-full overflow-hidden rounded-xl bg-ink-50" style={{ aspectRatio: "4/3" }}>
              <img
                key={displayImage.id}
                src={getImageUrl(displayImage.image_url)}
                alt={resource.title}
                className="absolute inset-0 h-full w-full object-contain transition-opacity duration-300"
              />
              {displayImage.is_primary && (
                <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-forest-700/90 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                  <Star className="h-3 w-3 fill-white" /> Primary
                </span>
              )}
            </div>
            {/* Thumbnails */}
            {resource.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {resource.images.map((img) => {
                  const isActive = img.id === (displayImage?.id);
                  return (
                    <button
                      key={img.id}
                      onClick={() => setActiveImageId(img.id)}
                      className={`relative flex-shrink-0 h-16 w-20 rounded-lg overflow-hidden border-2 transition-all ${
                        isActive ? "border-forest-500 ring-2 ring-forest-300" : "border-transparent hover:border-ink-300"
                      }`}
                    >
                      <img
                        src={getImageUrl(img.image_url)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      {img.is_primary && (
                        <span className="absolute bottom-0 left-0 right-0 bg-forest-700/80 text-white text-[8px] text-center font-semibold py-0.5">
                          Primary
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-xl bg-ink-50 font-display text-5xl text-ink-300" style={{ aspectRatio: "4/3" }}>
            {resource.title.charAt(0)}
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleUpdate} className="card space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink-900">Edit Listing Details</h2>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-xs font-semibold text-ink-500 hover:text-ink-900"
              >
                Cancel
              </button>
            </div>
            
            <div>
              <label className="label">Title</label>
              <input
                required
                className="input"
                value={editForm.title}
                onChange={updateEditField("title")}
                placeholder="e.g. Canon DSLR Camera"
              />
            </div>
            
            <div>
              <label className="label">Description</label>
              <textarea
                required
                minLength={10}
                rows={4}
                className="input"
                value={editForm.description}
                onChange={updateEditField("description")}
                placeholder="Describe the item, its accessories, and any usage notes..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Category</label>
                <select
                  required
                  className="input"
                  value={editForm.category_id}
                  onChange={updateEditField("category_id")}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Condition</label>
                <select
                  className="input"
                  value={editForm.condition}
                  onChange={updateEditField("condition")}
                >
                  <option value="new">New</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="worn">Worn</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Quantity</label>
                <input
                  type="number"
                  min={1}
                  className="input"
                  value={editForm.quantity}
                  onChange={updateEditField("quantity")}
                />
              </div>
              <div>
                <label className="label">Max borrow days</label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  className="input"
                  value={editForm.max_borrow_days}
                  onChange={updateEditField("max_borrow_days")}
                />
              </div>
              <div>
                <label className="label">Deposit (₹)</label>
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={editForm.deposit_amount}
                  onChange={updateEditField("deposit_amount")}
                />
              </div>
            </div>
            
            <div>
              <label className="label">Pickup location</label>
              <input
                className="input"
                value={editForm.pickup_location}
                onChange={updateEditField("pickup_location")}
                placeholder="e.g. Hostel Block C, Room 204"
              />
            </div>
            
            <div>
              <label className="label">Tags (comma-separated)</label>
              <input
                className="input"
                value={editForm.tags}
                onChange={updateEditField("tags")}
                placeholder="electronics, photography, camera"
              />
            </div>
            
            <button
              type="submit"
              disabled={submittingEdit}
              className="btn-primary w-full"
            >
              {submittingEdit ? "Saving changes..." : "Save Changes"}
            </button>
          </form>
        ) : (
          <div className="space-y-2">
            <div>
              <span className="rounded bg-ink-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
                {resource.category.name}
              </span>
              <h1 className="mt-2 font-display text-2xl font-semibold text-ink-900">{resource.title}</h1>
              <p className="mt-2 whitespace-pre-line text-sm text-ink-700">{resource.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5 pt-4">
              <div className="card p-3 text-center">
                <Star className="mx-auto mb-1 h-4 w-4 fill-brass-500 text-brass-500" />
                <p className="text-sm font-semibold text-ink-900">{Number(resource.average_rating).toFixed(1)}</p>
                <p className="text-xs text-ink-500">Rating</p>
              </div>
              <div className="card p-3 text-center">
                <Package className="mx-auto mb-1 h-4 w-4 text-forest-700" />
                <p className="text-sm font-semibold text-ink-900">{resource.quantity_available}</p>
                <p className="text-xs text-ink-500">Available</p>
              </div>
              <div className="card p-3 text-center">
                <Shield className="mx-auto mb-1 h-4 w-4 text-forest-700" />
                <p className="text-sm font-semibold capitalize text-ink-900">{resource.condition}</p>
                <p className="text-xs text-ink-500">Condition</p>
              </div>
              <div className="card p-3 text-center">
                <MapPin className="mx-auto mb-1 h-4 w-4 text-forest-700" />
                <p className="truncate text-sm font-semibold text-ink-900">{resource.pickup_location || "—"}</p>
                <p className="text-xs text-ink-500">Pickup</p>
              </div>
              <div className="card p-3 text-center flex flex-col justify-between">
                <span className="mx-auto mb-1 text-sm font-bold text-forest-700">₹</span>
                <p className="text-sm font-semibold text-ink-900">
                  {resource.deposit_amount > 0 ? `₹${resource.deposit_amount}` : "No deposit"}
                </p>
                <p className="text-xs text-ink-500">Deposit</p>
              </div>
            </div>
          </div>
        )}

        {/* Reviews Section */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink-900">Reviews ({reviews.length})</h2>
          </div>

          {/* User Review Form */}
          {isEligibleToReview && (
            <form onSubmit={handleReviewSubmit} className="card p-5 space-y-3">
              <h3 className="font-display text-sm font-semibold text-ink-900">Write a Review</h3>
              <div>
                <label className="label">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewReviewRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`h-5 w-5 ${
                          star <= newReviewRating
                            ? "fill-brass-500 text-brass-500"
                            : "text-ink-200"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Comment (optional)</label>
                <textarea
                  rows={2}
                  placeholder="Share your experience borrowing this item..."
                  className="input"
                  value={newReviewComment}
                  onChange={(e) => setNewReviewComment(e.target.value)}
                />
              </div>
              <button type="submit" disabled={submittingReview} className="btn-brass w-full text-xs">
                {submittingReview ? "Submitting..." : "Submit Review"}
              </button>
            </form>
          )}

          {reviews.length === 0 ? (
            <p className="text-sm text-ink-500">No reviews yet.</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-ink-900">{r.reviewer.full_name}</p>
                      <p className="text-xs text-ink-400">
                        {r.reviewer.department || "Campus member"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs text-brass-700 bg-brass-50 px-2 py-0.5 rounded-full">
                        <Star className="h-3.5 w-3.5 fill-brass-500 text-brass-500" /> {r.rating}
                      </span>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteReview(r.id)}
                          title="Delete review (Admin)"
                          className="p-1 rounded hover:bg-rose-50 text-rose-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {r.comment && <p className="mt-2 text-sm text-ink-700">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Controls */}
      <div className="space-y-4">
        {/* Owner Info Box */}
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Shared by</p>
          <p className="mt-1 font-display text-base font-semibold text-ink-900">
            <Link to={`/users/${resource.owner.id}`} className="hover:underline">
              {resource.owner.full_name}
            </Link>
          </p>
          <p className="text-sm text-ink-500">{resource.owner.department || "Campus member"}</p>
          
          <div className="mt-4 border-t border-ink-100 pt-3 flex justify-between text-xs">
            <span className="text-ink-500 font-medium">Security Deposit:</span>
            <span className={`font-semibold ${resource.deposit_amount > 0 ? "text-forest-700" : "text-ink-600"}`}>
              {resource.deposit_amount > 0 ? `₹${resource.deposit_amount}` : "No deposit required"}
            </span>
          </div>
        </div>

        {/* Regular Borrow Form */}
        {!isOwner && resource.status === "available" && (
          <form onSubmit={handleBorrowRequest} className="card space-y-3 p-5">
            <h3 className="font-display text-base font-semibold text-ink-900">Request to borrow</h3>
            <div className="rounded bg-ink-50 p-2.5 text-center text-xs">
              <div className="mb-1">
                <span className="text-ink-600 font-medium">Max borrow period: <strong className="text-ink-900">{resource.max_borrow_days} days</strong></span>
              </div>
              {resource.deposit_amount > 0 ? (
                <span>Security deposit required: <strong className="text-forest-700 font-semibold">₹{resource.deposit_amount}</strong></span>
              ) : (
                <span className="text-ink-600 font-medium">No security deposit required</span>
              )}
            </div>
            <div>
              <label className="label">From</label>
              <input
                required
                type="date"
                className="input"
                value={startDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  // Reset end date if it violates new max
                  if (e.target.value && endDate) {
                    const s = new Date(e.target.value);
                    const eDate = new Date(endDate);
                    const diffDays = Math.ceil((eDate - s) / (1000 * 60 * 60 * 24));
                    if (diffDays > resource.max_borrow_days) setEndDate("");
                  }
                }}
              />
            </div>
            <div>
              <label className="label">Until</label>
              <input
                required
                type="date"
                className="input"
                value={endDate}
                min={startDate || new Date().toISOString().split("T")[0]}
                max={
                  startDate
                    ? new Date(new Date(startDate).setDate(new Date(startDate).getDate() + resource.max_borrow_days)).toISOString().split("T")[0]
                    : undefined
                }
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Purpose (optional)</label>
              <textarea rows={3} className="input" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
            </div>
            <button type="submit" disabled={submittingBorrow} className="btn-brass w-full">
              {submittingBorrow ? "Sending..." : "Send borrow request"}
            </button>
          </form>
        )}

        {!isOwner && resource.status !== "available" && (
          <div className="card p-5 text-center text-sm text-ink-500">
            This resource is currently <span className="font-semibold text-ink-700 capitalize">{resource.status.replace("_", " ")}</span>.
          </div>
        )}

        {/* Owner Management Controls */}
        {isOwner && (
          <div className="space-y-4">
            <div className="card p-5 space-y-4">
              <h3 className="font-display text-sm font-semibold text-ink-900">Owner Tools</h3>
              
              <div className="flex flex-col gap-2">
                <button
                  onClick={startEditing}
                  disabled={isEditing}
                  className="btn-secondary w-full justify-start text-ink-700"
                >
                  <Edit3 className="h-4 w-4 text-ink-500" />
                  Edit details
                </button>
                <button
                  onClick={handleDeleteListing}
                  className="btn bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 w-full justify-start"
                >
                  <Trash2 className="h-4 w-4 text-rose-500" />
                  Delete listing
                </button>
              </div>
            </div>

            {/* Photo Management */}
            <div className="card p-5 space-y-4">
              <h3 className="font-display text-sm font-semibold text-ink-900">Manage Photos</h3>
              
              {/* Photo Upload Form */}
              <div className="space-y-3">
                <div>
                  <label className="label">Upload new photo</label>
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      id="owner-image-upload"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                    <label
                      htmlFor="owner-image-upload"
                      className={`btn-secondary cursor-pointer w-full text-center ${
                        uploadingImage ? "pointer-events-none opacity-50" : ""
                      }`}
                    >
                      {uploadingImage ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                          Uploading...
                        </>
                      ) : (
                        "Choose Image File"
                      )}
                    </label>
                  </div>
                </div>
              </div>

              {/* Existing Photos Grid */}
              {resource.images?.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-ink-100">
                  <p className="label">Current Photos</p>
                  <div className="grid grid-cols-2 gap-2">
                    {resource.images.map((img) => (
                      <div key={img.id} className="relative group border border-ink-100 rounded-lg overflow-hidden bg-ink-50">
                        <img
                          src={getImageUrl(img.image_url)}
                          alt=""
                          className="h-20 w-full object-cover"
                        />
                        {/* Action overlay on hover */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          {/* Set as Primary */}
                          {!img.is_primary && (
                            <button
                              onClick={() => handleSetPrimary(img.id)}
                              disabled={settingPrimaryId === img.id}
                              className="p-1 rounded bg-forest-600 hover:bg-forest-700 text-white"
                              title="Make Primary Photo"
                            >
                              {settingPrimaryId === img.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Star className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteImage(img.id)}
                            className="p-1 rounded bg-rose-600 hover:bg-rose-700 text-white"
                            title="Delete Photo"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {/* Primary badge */}
                        {img.is_primary && (
                          <span className="absolute bottom-1 left-1 bg-forest-700 text-white text-[9px] px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5">
                            <Star className="h-2.5 w-2.5 fill-white" /> Primary
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Admins can also delete listings if needed */}
        {isAdmin && !isOwner && (
          <div className="card p-5 space-y-3">
            <h3 className="font-display text-sm font-semibold text-ink-900">Admin Tools</h3>
            <button
              onClick={handleDeleteListing}
              className="btn bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 w-full justify-start"
            >
              <Trash2 className="h-4 w-4 text-rose-500" />
              Delete listing (Admin)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

