import { cn, getInitials } from "../../lib/utils";

interface AvatarProps {
  src?: string | null;
  firstName: string;
  lastName: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  showStatus?: boolean;
  isOnline?: boolean;
}

export default function Avatar({
  src,
  firstName,
  lastName,
  size = "md",
  className,
  showStatus = false,
  isOnline = false,
}: AvatarProps) {
  const sizes = {
    xs: "w-6 h-6 text-xs",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-lg",
  };

  const statusSizes = {
    xs: "w-1.5 h-1.5",
    sm: "w-2 h-2",
    md: "w-2.5 h-2.5",
    lg: "w-3 h-3",
    xl: "w-4 h-4",
  };

  const initials = getInitials(firstName, lastName);

  // Generate a consistent color based on the name
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-cyan-500",
    "bg-teal-500",
    "bg-orange-500",
  ];
  const colorIndex =
    (firstName.charCodeAt(0) + lastName.charCodeAt(0)) % colors.length;
  const bgColor = colors[colorIndex];

  return (
    <div className={cn("relative inline-block", className)}>
      {src ? (
        <img
          src={src}
          alt={`${firstName} ${lastName}`}
          className={cn("rounded-full object-cover", sizes[size])}
        />
      ) : (
        <div
          className={cn(
            "rounded-full flex items-center justify-center text-white font-medium",
            sizes[size],
            bgColor
          )}
        >
          {initials}
        </div>
      )}

      {showStatus && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-2 border-white",
            statusSizes[size],
            isOnline ? "bg-green-500" : "bg-slate-300"
          )}
        />
      )}
    </div>
  );
}

// Avatar group for showing multiple assignees
interface AvatarGroupProps {
  users: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  }>;
  max?: number;
  size?: "xs" | "sm" | "md";
}

export function AvatarGroup({ users, max = 3, size = "sm" }: AvatarGroupProps) {
  const displayed = users.slice(0, max);
  const remaining = users.length - max;

  const overlapSizes = {
    xs: "-ml-1.5",
    sm: "-ml-2",
    md: "-ml-2.5",
  };

  const remainingSizes = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
  };

  return (
    <div className="flex items-center">
      {displayed.map((user, index) => (
        <div
          key={user._id}
          className={cn(
            "relative ring-2 ring-white rounded-full",
            index > 0 && overlapSizes[size]
          )}
          style={{ zIndex: displayed.length - index }}
        >
          <Avatar
            src={user.avatar}
            firstName={user.firstName}
            lastName={user.lastName}
            size={size}
          />
        </div>
      ))}

      {remaining > 0 && (
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-slate-200 text-slate-600 font-medium ring-2 ring-white",
            overlapSizes[size],
            remainingSizes[size]
          )}
          style={{ zIndex: 0 }}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
