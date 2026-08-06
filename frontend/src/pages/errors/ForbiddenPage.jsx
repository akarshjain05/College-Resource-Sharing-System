import { useNavigate } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";
import ErrorState from "../../components/ui/ErrorState";

export default function ForbiddenPage({ message = "You do not have permission to access this page or perform this action." }) {
  const navigate = useNavigate();

  return (
    <ErrorState 
      code="403"
      title="Access Denied"
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
