/**
 * Resolves a raw backend notification link into a correct frontend route.
 * 
 * Examples:
 * - "/borrow-requests/3eb07f0f-8703-4e4b-97b7-56e632b7194f" => "/borrow-requests?id=3eb07f0f-8703-4e4b-97b7-56e632b7194f"
 * - "/damage-claims/3eb07f0f-8703-4e4b-97b7-56e632b7194f" => "/borrow-requests"
 * - "/borrow-requests?tab=incoming" => "/borrow-requests?tab=incoming"
 * - "/resources/3eb07f0f-8703-4e4b-97b7-56e632b7194f" => "/resources/3eb07f0f-8703-4e4b-97b7-56e632b7194f"
 */
export function resolveNotificationLink(link, notification = null) {
    if (!link && !notification) return "/my-bookings";

    let rawLink = link || "";
    const [pathPart, queryString] = rawLink.split("?");
    const params = new URLSearchParams(queryString || "");

    const messageStr = typeof notification?.message === 'object' ? (notification.message.body || "") : (notification?.message || "");

    // Check if notification is for a lender action (e.g. Payment Received, New borrow request, Return requested, Offer was accepted)
    const isLenderAction = notification && (
        notification.title?.toLowerCase().includes("payment received") ||
        messageStr.toLowerCase().includes("payment received") ||
        notification.title?.toLowerCase().includes("new borrow request") ||
        notification.title?.toLowerCase().includes("return requested") ||
        notification.title?.toLowerCase().includes("offer was accepted") ||
        notification.title?.toLowerCase().includes("waiting for handover") ||
        notification.title?.toLowerCase().includes("waiting on your response") ||
        notification.title?.toLowerCase().includes("handover confirmed") ||
        notification.title?.toLowerCase().includes("handover rejected")
    );

    if (isLenderAction && !params.has("tab")) {
        params.set("tab", "lending");
    }

    // Handle /borrow-requests/:id
    const borrowRequestMatch = pathPart.match(/^\/borrow-requests\/([a-f\d-]+)/i);
    if (borrowRequestMatch) {
        params.set("id", borrowRequestMatch[1]);
    }

    // Handle /damage-claims/:id -> /borrow-requests
    const damageClaimMatch = pathPart.match(/^\/damage-claims\/([a-f\d-]+)/i);
    if (damageClaimMatch) {
        return `/my-bookings?${params.toString()}`;
    }

    if (pathPart.startsWith("/borrow-requests") || borrowRequestMatch) {
        return `/my-bookings?${params.toString()}`;
    }

    return rawLink || "/my-bookings";
}
