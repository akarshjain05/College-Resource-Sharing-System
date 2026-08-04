/**
 * Resolves a raw backend notification link into a correct frontend route.
 * 
 * Examples:
 * - "/borrow-requests/3eb07f0f-8703-4e4b-97b7-56e632b7194f" => "/borrow-requests?id=3eb07f0f-8703-4e4b-97b7-56e632b7194f"
 * - "/damage-claims/3eb07f0f-8703-4e4b-97b7-56e632b7194f" => "/borrow-requests"
 * - "/borrow-requests?tab=incoming" => "/borrow-requests?tab=incoming"
 * - "/resources/3eb07f0f-8703-4e4b-97b7-56e632b7194f" => "/resources/3eb07f0f-8703-4e4b-97b7-56e632b7194f"
 */
export function resolveNotificationLink(link) {
    if (!link) return "/borrow-requests";

    let rawLink = link || "";
    const [pathPart, queryString] = rawLink.split("?");
    const params = new URLSearchParams(queryString || "");

    // Handle /borrow-requests/:id
    const borrowRequestMatch = pathPart.match(/^\/borrow-requests\/([a-f\d-]+)/i);
    if (borrowRequestMatch) {
        params.set("id", borrowRequestMatch[1]);
    }

    // Handle /damage-claims/:id -> /borrow-requests
    const damageClaimMatch = pathPart.match(/^\/damage-claims\/([a-f\d-]+)/i);
    if (damageClaimMatch) {
        return `/borrow-requests?${params.toString()}`;
    }

    if (pathPart.startsWith("/borrow-requests") || borrowRequestMatch) {
        return `/borrow-requests?${params.toString()}`;
    }

    return rawLink || "/borrow-requests";
}
