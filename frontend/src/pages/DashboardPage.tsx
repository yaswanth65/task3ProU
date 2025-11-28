import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  CalendarIcon,
  PlusIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useTaskStore } from "../stores/taskStore";
import { useAuthStore } from "../stores/authStore";
import Avatar from "../components/ui/Avatar";
import Button from "../components/ui/Button";
import { StatusBadge, PriorityBadge } from "../components/ui/Badge";
import { formatDate, isOverdue } from "../lib/utils";
import CreateTaskModal from "../components/tasks/CreateTaskModal";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444"];

// Custom label renderer to prevent overlap
const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  name,
  value,
  index,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  name: string;
  value: number;
  index: number;
}) => {
  if (value === 0) return null;

  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 30;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill={COLORS[index % COLORS.length]}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={12}
      fontWeight={500}
    >
      {`${name}: ${value}`}
    </text>
  );
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { tasks, loading, fetchTasks } = useTaskStore();
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "done").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const overdue = tasks.filter(
      (t) => t.dueDate && isOverdue(t.dueDate) && t.status !== "done"
    ).length;

    return { total, completed, inProgress, overdue };
  }, [tasks]);

  // Tasks by status for pie chart
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {
      "To Do": 0,
      "In Progress": 0,
      "In Review": 0,
      Done: 0,
    };

    tasks.forEach((task) => {
      switch (task.status) {
        case "todo":
        case "backlog":
          counts["To Do"]++;
          break;
        case "in_progress":
          counts["In Progress"]++;
          break;
        case "in_review":
          counts["In Review"]++;
          break;
        case "done":
          counts["Done"]++;
          break;
      }
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [tasks]);

  // Tasks by priority for bar chart
  const priorityData = useMemo(() => {
    const counts: Record<string, number> = {
      Low: 0,
      Medium: 0,
      High: 0,
      Urgent: 0,
    };

    tasks.forEach((task) => {
      switch (task.priority) {
        case "low":
          counts["Low"]++;
          break;
        case "medium":
          counts["Medium"]++;
          break;
        case "high":
          counts["High"]++;
          break;
        case "urgent":
          counts["Urgent"]++;
          break;
      }
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [tasks]);

  // Recent tasks
  const recentTasks = useMemo(() => {
    return [...tasks]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 5);
  }, [tasks]);

  // Upcoming deadlines
  const upcomingTasks = useMemo(() => {
    return tasks
      .filter((t) => t.dueDate && t.status !== "completed")
      .sort(
        (a, b) =>
          new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
      )
      .slice(0, 5);
  }, [tasks]);

  const statCards = [
    {
      title: "Total Tasks",
      value: stats.total,
      icon: ClipboardDocumentListIcon,
      color: "bg-primary-500",
      bgColor: "bg-primary-50",
    },
    {
      title: "Completed",
      value: stats.completed,
      icon: CheckCircleIcon,
      color: "bg-green-500",
      bgColor: "bg-green-50",
    },
    {
      title: "In Progress",
      value: stats.inProgress,
      icon: ClockIcon,
      color: "bg-blue-500",
      bgColor: "bg-blue-50",
    },
    {
      title: "Overdue",
      value: stats.overdue,
      icon: ExclamationTriangleIcon,
      color: "bg-red-500",
      bgColor: "bg-red-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {user?.firstName}! 👋
          </h1>
          <p className="text-slate-600">
            Here's what's happening with your tasks today.
          </p>
        </div>
        <Button
          leftIcon={<PlusIcon className="w-4 h-4" />}
          onClick={() => setShowCreateModal(true)}
        >
          New Task
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl p-6 border border-slate-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">{stat.title}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {stat.value}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <stat.icon
                  className={`w-6 h-6 ${stat.color.replace("bg-", "text-")}`}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks by Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl p-6 border border-slate-200"
        >
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Tasks by Status
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData.filter((d) => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={renderCustomLabel}
                  labelLine={false}
                >
                  {statusData
                    .filter((d) => d.value > 0)
                    .map((entry, index) => (
                      <Cell
                        key={`cell-${entry.name}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Tasks by Priority */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl p-6 border border-slate-200"
        >
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Tasks by Priority
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Recent tasks and upcoming deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl border border-slate-200"
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">
              Recent Tasks
            </h2>
            <Link
              to="/tasks"
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              View all <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentTasks.length > 0 ? (
              recentTasks.map((task) => (
                <Link
                  key={task._id}
                  to={`/tasks/${task._id}`}
                  className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={task.status} />
                      <PriorityBadge priority={task.priority} />
                    </div>
                  </div>
                  {task.assignee && (
                    <Avatar
                      src={task.assignee.avatar}
                      firstName={task.assignee.firstName}
                      lastName={task.assignee.lastName}
                      size="sm"
                    />
                  )}
                </Link>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500">
                No tasks yet. Create your first task!
              </div>
            )}
          </div>
        </motion.div>

        {/* Upcoming Deadlines */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-xl border border-slate-200"
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">
              Upcoming Deadlines
            </h2>
            <Link
              to="/calendar"
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              Calendar <CalendarIcon className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {upcomingTasks.length > 0 ? (
              upcomingTasks.map((task) => (
                <Link
                  key={task._id}
                  to={`/tasks/${task._id}`}
                  className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors"
                >
                  <div
                    className={`p-2 rounded-lg ${
                      isOverdue(task.dueDate!) ? "bg-red-50" : "bg-slate-50"
                    }`}
                  >
                    <CalendarIcon
                      className={`w-5 h-5 ${
                        isOverdue(task.dueDate!)
                          ? "text-red-500"
                          : "text-slate-500"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {task.title}
                    </p>
                    <p
                      className={`text-xs mt-0.5 ${
                        isOverdue(task.dueDate!)
                          ? "text-red-600"
                          : "text-slate-500"
                      }`}
                    >
                      {formatDate(task.dueDate!)}
                      {isOverdue(task.dueDate!) && " (Overdue)"}
                    </p>
                  </div>
                  <PriorityBadge priority={task.priority} />
                </Link>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500">
                No upcoming deadlines.
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
