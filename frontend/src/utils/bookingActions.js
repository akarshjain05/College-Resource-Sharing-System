export function getAvailableActions(booking, isLender) {
  const actions = [];
  
  if (!booking) return actions;
  
  if (!isLender) {
    if (booking.status === "requested") {
      actions.push("nudge", "cancel");
    }
    if (booking.status === "approved") {
      if ((!booking.payment || booking.payment.status !== "paid") && booking.total_amount > 0) {
        actions.push("pay", "cancel");
      } else {
        actions.push("request_handover");
      }
    }
    if (booking.status === "active") {
      actions.push("return");
    }
  } else {
    // Lender actions
    if (booking.status === "requested") {
      actions.push("approve", "reject");
    }
    if (booking.status === "handover_requested") {
      actions.push("handover");
    }
    if (booking.status === "return_requested") {
      actions.push("confirm_return", "report_damage");
    }
  }
  
  return actions;
}
