import {
  cn,
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
} from "../../lib/utils";
import type { TaskStatus, TaskPriority } from "../../stores/taskStore";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info";
  size?: "sm" | "md";
  className?: string;
}

export default function Badge({
  children,
  variant = "default",
  size = "sm",
  className,
}: BadgeProps) {
  const variants = {
    default: "bg-slate-100 text-slate-700",
    success: "bg-green-100 text-green-700",
    warning: "bg-yellow-100 text-yellow-700",
    error: "bg-red-100 text-red-700",
    info: "bg-blue-100 text-blue-700",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
}

// Status badge
interface StatusBadgeProps {
  status: TaskStatus;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full",
        STATUS_COLORS[status],
        sizes[size]
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

// Priority badge
interface PriorityBadgeProps {
  priority: TaskPriority;
  size?: "sm" | "md";
  showDot?: boolean;
}

export function PriorityBadge({
  priority,
  size = "sm",
  showDot = false,
}: PriorityBadgeProps) {
  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
  };

  const dotColors = {
    low: "bg-green-500",
    medium: "bg-yellow-500",
    high: "bg-orange-500",
    urgent: "bg-red-500",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full border gap-1.5",
        PRIORITY_COLORS[priority],
        sizes[size]
      )}
    >
      {showDot && (
        <span className={cn("w-1.5 h-1.5 rounded-full", dotColors[priority])} />
      )}
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

// Tag badge
interface TagBadgeProps {
  tag: string;
  onRemove?: () => void;
}

export function TagBadge({ tag, onRemove }: TagBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
      #{tag}
      {onRemove && (
        <button
          onClick={onRemove}
          className="hover:text-slate-900 transition-colors"
        >
          ×
        </button>
      )}
    </span>
  );
}
