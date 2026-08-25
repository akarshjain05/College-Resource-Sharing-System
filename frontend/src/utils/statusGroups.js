export const STATUS_GROUPS = {
  upcoming: ["requested", "pending", "approved", "handover_requested", "cancellation_requested"],
  ongoing: ["active", "ongoing", "return_requested", "late"],
  completed: ["returned", "confirmed_return", "damaged"],
  cancelled: ["cancelled", "rejected"],
};
