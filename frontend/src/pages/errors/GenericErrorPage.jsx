import { RefreshCw, Home } from "lucide-react";
import ErrorState from "../../components/ui/ErrorState";

export default function GenericErrorPage({ message = "Something went wrong on our end. Please try again later.", onRetry }) {
  return (
    <ErrorState 
      code="500"
      title="Internal Server Error"
      message={message}
      primaryAction={{
        label: "Back to Home",
        to: "/",
        icon: <Home className="w-4 h-4" />
      }}
      secondaryAction={onRetry ? {
        label: "Try Again",
        onClick: onRetry,
        icon: <RefreshCw className="w-4 h-4" />
      } : undefined}
    />
  );
}
