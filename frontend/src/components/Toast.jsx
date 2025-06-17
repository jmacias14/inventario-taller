import { useToast } from "../context/ToastContext";
import { CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

export default function Toast() {
  const { toasts } = useToast();

  const variantStyles = {
    success: {
      icon: <CheckCircle className="w-6 h-6 text-green-600" />,
      bg: "bg-green-50 border-green-500 text-green-700"
    },
    error: {
      icon: <AlertCircle className="w-6 h-6 text-red-600" />,
      bg: "bg-red-50 border-red-500 text-red-700"
    },
    warning: {
      icon: <AlertTriangle className="w-6 h-6 text-yellow-600" />,
      bg: "bg-yellow-50 border-yellow-500 text-yellow-700"
    },
    info: {
      icon: <Info className="w-6 h-6 text-blue-600" />,
      bg: "bg-blue-50 border-blue-500 text-blue-700"
    }
  };

  return (
      <div className="fixed bottom-4 right-4 z-[1000] space-y-3 w-[350px]">
      {toasts.map(({ id, message, type }) => {
        const variant = variantStyles[type] || variantStyles.info;
        return (
          <div
            key={id}
            className={`flex items-start gap-3 rounded-xl border p-4 shadow-lg ${variant.bg}`}
          >
            {variant.icon}
            <div className="text-sm font-medium">{message}</div>
          </div>
        );
      })}
    </div>
  );
}
