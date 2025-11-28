import { useState, useEffect, useCallback } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  BellIcon,
} from "@heroicons/react/24/outline";
import { useAuthStore } from "../stores/authStore";
import { useMessageStore } from "../stores/messageStore";
import { useSocket, useSocketEvent } from "../lib/socket";
import Avatar from "./ui/Avatar";
import Button from "./ui/Button";
import CreateTaskModal from "./tasks/CreateTaskModal";
import OnboardingOverlay from "./OnboardingOverlay";
import { cn } from "../lib/utils";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  managerOnly?: boolean;
}

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
  { name: "Tasks", href: "/tasks", icon: ClipboardDocumentListIcon },
  { name: "Calendar", href: "/calendar", icon: CalendarIcon },
  { name: "Messages", href: "/messages", icon: ChatBubbleLeftRightIcon },
  { name: "Team", href: "/team", icon: UserGroupIcon, managerOnly: true },
  { name: "Reports", href: "/reports", icon: ChartBarIcon, managerOnly: true },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { unreadCount, fetchUnreadCount } = useMessageStore();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Initialize socket
  useSocket();

  // Fetch unread messages count
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Check if onboarding needed
  useEffect(() => {
    if (user && !user.onboardingCompleted) {
      setShowOnboarding(true);
    }
  }, [user]);

  // Socket event for new messages
  const handleNewMessage = useCallback(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  useSocketEvent("message:new", handleNewMessage);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
      }
      // Cmd/Ctrl + N for new task
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        setShowCreateTask(true);
      }
      // Escape to close modals
      if (e.key === "Escape") {
        setShowSearch(false);
        setShowCreateTask(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const filteredNav = navigation.filter(
    (item) => !item.managerOnly || user?.role === "manager"
  );

  return (
    <div className="h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform lg:flex-shrink-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "lg:relative lg:translate-x-0 lg:z-auto"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-slate-100">
            <NavLink to="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold gradient-text">TaskFlow</span>
            </NavLink>
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Quick add button */}
          <div className="p-4">
            <Button
              onClick={() => setShowCreateTask(true)}
              className="w-full"
              leftIcon={<PlusIcon className="w-4 h-4" />}
            >
              New Task
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
            {filteredNav.map((item) => {
              const isActive = location.pathname.startsWith(item.href);
              const badge =
                item.name === "Messages" ? unreadCount.total : undefined;

              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary-50 text-primary-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="flex-1">{item.name}</span>
                  {badge && badge > 0 && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-500 text-white">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* User menu */}
          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-3 mb-3">
              <Avatar
                src={user?.avatar}
                firstName={user?.firstName || ""}
                lastName={user?.lastName || ""}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-slate-500 capitalize">
                  {user?.role}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <NavLink
                to="/settings"
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <Cog6ToothIcon className="w-4 h-4" />
                Settings
              </NavLink>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center p-2 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 h-screen overflow-hidden">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-sm border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center justify-between h-full px-4 lg:px-6">
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
                onClick={() => setSidebarOpen(true)}
              >
                <Bars3Icon className="w-6 h-6" />
              </button>

              {/* Search */}
              <button
                onClick={() => setShowSearch(true)}
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <MagnifyingGlassIcon className="w-4 h-4" />
                <span>Search...</span>
                <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-white rounded border border-slate-200">
                  ⌘K
                </kbd>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Mobile search */}
              <button
                className="sm:hidden p-2 rounded-lg hover:bg-slate-100"
                onClick={() => setShowSearch(true)}
              >
                <MagnifyingGlassIcon className="w-5 h-5" />
              </button>

              {/* Notifications */}
              <button className="p-2 rounded-lg hover:bg-slate-100 relative">
                <BellIcon className="w-5 h-5 text-slate-600" />
                {unreadCount.total > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>

              {/* Quick add (mobile) */}
              <button
                className="sm:hidden p-2 rounded-lg bg-primary-600 text-white"
                onClick={() => setShowCreateTask(true)}
              >
                <PlusIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-50">
          <Outlet />
        </main>
      </div>

      {/* Modals */}
      <CreateTaskModal
        isOpen={showCreateTask}
        onClose={() => setShowCreateTask(false)}
      />

      {/* Search modal - placeholder */}
      {showSearch && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-900/50"
          onClick={() => setShowSearch(false)}
        >
          <div
            className="w-full max-w-xl bg-white rounded-xl shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
              <MagnifyingGlassIcon className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search tasks, people, messages..."
                className="flex-1 text-sm outline-none"
                autoFocus
              />
              <kbd className="px-2 py-1 text-xs font-medium bg-slate-100 rounded border border-slate-200">
                ESC
              </kbd>
            </div>
            <div className="p-4 text-center text-sm text-slate-500">
              Start typing to search...
            </div>
          </div>
        </div>
      )}

      {/* Onboarding overlay */}
      {showOnboarding && (
        <OnboardingOverlay onComplete={() => setShowOnboarding(false)} />
      )}
    </div>
  );
}
