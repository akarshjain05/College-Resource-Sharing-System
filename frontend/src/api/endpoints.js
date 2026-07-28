import api, { getImageUrl } from "./client";

export const authApi = {
  register: (payload) => api.post("/auth/register", payload),
  login: (email, password) => {
    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", password);
    return api.post("/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  },
  googleLogin: (credential) => api.post("/auth/google", { credential }),
   completeGoogleProfile: (payload) => api.post("/auth/google/complete-profile", payload),
  me: () => api.get("/auth/me"),
  changePassword: (payload) => api.post("/auth/change-password", payload),
  forgotPassword: (email) => api.post("/auth/forgot-password", { email }),
  resetPassword: (payload) => api.post("/auth/reset-password", payload),
};

export const userApi = {
  getMyProfile: () => api.get("/users/me"),
  updateMyProfile: (payload) => api.put("/users/me", payload),
  getUser: (id) => api.get(`/users/${id}`),
  listUsers: (params) => api.get("/users", { params }),
  listPublicDirectory: () => api.get("/users/directory/public"),
  suspendUser: (id) => api.post(`/users/${id}/suspend`),
  unsuspendUser: (id) => api.post(`/users/${id}/unsuspend`),
};

export const categoryApi = {
  list: () => api.get("/categories"),
  create: (payload) => api.post("/categories", payload),
  remove: (id) => api.delete(`/categories/${id}`),
};

export const resourceApi = {
  list: (params) => api.get("/resources", { params }),
  get: (id) => api.get(`/resources/${id}`),
  create: (payload) => api.post("/resources", payload),
  update: (id, payload) => api.put(`/resources/${id}`, payload),
  remove: (id) => api.delete(`/resources/${id}`),
  getAvailability: (id) => api.get(`/resources/${id}/availability`),
  addImage: (id, imageUrl, isPrimary = false) =>
    api.post(`/resources/${id}/images`, null, { params: { image_url: imageUrl, is_primary: isPrimary } }),
};

export const borrowApi = {
  create: (payload) => api.post("/borrow-requests", payload),
  myRequests: (status) => api.get("/borrow-requests/my-requests", { params: { status } }),
  incoming: (status) => api.get("/borrow-requests/incoming", { params: { status } }),
  approve: (id) => api.post(`/borrow-requests/${id}/approve`),
  reject: (id, reason) => api.post(`/borrow-requests/${id}/reject`, { rejection_reason: reason }),
  nudge: (id) => api.post(`/borrow-requests/${id}/nudge`),
  handover: (id) => api.post(`/borrow-requests/${id}/handover`),
  cancel: (id) => api.post(`/borrow-requests/${id}/cancel`),
  returnItem: (id, damageReport, lenderRating, lenderReview) => api.post(`/borrow-requests/${id}/return`, { damage_report: damageReport, lender_rating: lenderRating, lender_review: lenderReview }),
  confirmReturn: (id, borrowerRating, borrowerReview) => api.post(`/borrow-requests/${id}/confirm-return`, { borrower_rating: borrowerRating, borrower_review: borrowerReview }),
};

export const reviewApi = {
  create: (payload) => api.post("/reviews", payload),
  listForResource: (resourceId) => api.get(`/resources/${resourceId}/reviews`),
  listForRequest: (requestId) => api.get(`/borrow-requests/${requestId}/reviews`),
  delete: (reviewId) => api.delete(`/reviews/${reviewId}`),
};

export const chatApi = {
  list: (requestId) => api.get(`/borrow-requests/${requestId}/messages`),
  send: (requestId, payload) => api.post(`/borrow-requests/${requestId}/messages`, payload),
  markRead: (requestId) => api.patch(`/borrow-requests/${requestId}/messages/read`),
};

export const notificationApi = {
  list: () => api.get("/notifications"),
  markRead: (id) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post("/notifications/read-all"),
};

export const wantedApi = {
  list: () => api.get("/wanted"),
  myNeeds: () => api.get("/wanted/me"),
  create: (data) => api.post("/wanted", data),
  fulfill: (id) => api.post(`/wanted/${id}/fulfill`),
  offer: (id, resourceId) => api.post(`/wanted/${id}/offer`, { resource_id: resourceId }),
  listOffers: (id) => api.get(`/wanted/${id}/offers`),
  acceptOffer: (offerId) => api.post(`/wanted/offers/${offerId}/accept`),
  delete: (id) => api.delete(`/wanted/${id}`),
};

export const usersApi = {
  getPublicProfile: (id) => api.get(`/users/${id}/public`),
};

export const wishlistApi = {
  list: () => api.get("/wishlist"),
  add: (resourceId) => api.post(`/wishlist/${resourceId}`),
  remove: (resourceId) => api.delete(`/wishlist/${resourceId}`),
};

export const adminApi = {
  overview: () => api.get("/admin/analytics/overview"),
  mostBorrowedCategories: () => api.get("/admin/analytics/most-borrowed-categories"),
  topContributors: () => api.get("/admin/analytics/top-contributors"),
  departmentUsage: () => api.get("/admin/analytics/department-usage"),
};

export const uploadApi = {
  uploadProfilePicture: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/uploads/profile-picture", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  uploadResourceImage: (resourceId, file, isPrimary = false) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(`/uploads/resources/${resourceId}/image`, formData, {
      params: { is_primary: isPrimary },
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  deleteResourceImage: (imageId) => api.delete(`/uploads/resources/images/${imageId}`),
  setPrimaryImage: (imageId) => api.patch(`/uploads/resources/images/${imageId}/set-primary`),
};

export { getImageUrl };

