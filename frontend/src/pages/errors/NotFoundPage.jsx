import { useNavigate } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";
import ErrorState from "../../components/ui/ErrorState";

export default function NotFoundPage({ message = "Sorry, but we can't find the page you are looking for..." }) {
  const navigate = useNavigate();

  return (
    <ErrorState 
      code="404"
      title="Page Not Found"
      message={message}
      primaryAction={{
        label: "Back to Home",
        to: "/",
        icon: <Home className="w-4 h-4" />
      }}
      secondaryAction={{
        label: "Go Back",
        onClick: () => navigate(-1),
        icon: <ArrowLeft className="w-4 h-4" />
      }}
    />
  );
}
