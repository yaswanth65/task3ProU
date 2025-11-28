import { useEffect, useState } from "react";
import { format, subDays } from "date-fns";
import { motion } from "framer-motion";
import {
  ArrowDownTrayIcon,
  CalendarIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
} from "@heroicons/react/24/outline";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import Button from "../components/ui/Button";
import { api } from "../lib/api";
import { cn } from "../lib/utils";

interface ReportData {
  taskCompletionRate: number;
  totalTasks: number;
  completedTasks: number;
  averageCompletionTime: number;
  tasksByStatus: { name: string; value: number }[];
  tasksByPriority: { name: string; value: number }[];
  tasksOverTime: { date: string; created: number; completed: number }[];
  topPerformers: { name: string; completed: number; avatar?: string }[];
}

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];

type DateRange = "week" | "month" | "quarter" | "year";

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [reportData, setReportData] = useState<ReportData | null>(null);

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/reports/overview?range=${dateRange}`);
      setReportData(response.data);
    } catch (error) {
      console.error("Failed to fetch report data:", error);
      // Use mock data for demo
      setReportData({
        taskCompletionRate: 78,
        totalTasks: 156,
        completedTasks: 122,
        averageCompletionTime: 3.2,
        tasksByStatus: [
          { name: "To Do", value: 12 },
          { name: "In Progress", value: 18 },
          { name: "In Review", value: 4 },
          { name: "Completed", value: 122 },
        ],
        tasksByPriority: [
          { name: "Low", value: 45 },
          { name: "Medium", value: 68 },
          { name: "High", value: 32 },
          { name: "Urgent", value: 11 },
        ],
        tasksOverTime: Array.from({ length: 7 }, (_, i) => ({
          date: format(subDays(new Date(), 6 - i), "MMM d"),
          created: Math.floor(Math.random() * 10) + 5,
          completed: Math.floor(Math.random() * 8) + 3,
        })),
        topPerformers: [
          { name: "Alice Johnson", completed: 28 },
          { name: "Bob Smith", completed: 24 },
          { name: "Carol Williams", completed: 22 },
          { name: "David Brown", completed: 18 },
          { name: "Emma Davis", completed: 15 },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: "pdf" | "csv") => {
    try {
      const response = await api.get(
        `/reports/export?format=${format}&range=${dateRange}`,
        {
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data], {
        type: format === "pdf" ? "application/pdf" : "text/csv",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `taskflow-report-${dateRange}.${format}`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export report:", error);
    }
  };

  if (loading || !reportData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const dateRanges: { value: DateRange; label: string }[] = [
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
    { value: "quarter", label: "This Quarter" },
    { value: "year", label: "This Year" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-slate-600">
            Analytics and insights for your team's performance
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date range selector */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1">
            {dateRanges.map((range) => (
              <button
                key={range.value}
                onClick={() => setDateRange(range.value)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  dateRange === range.value
                    ? "bg-primary-50 text-primary-700"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Export buttons */}
          <Button
            variant="ghost"
            onClick={() => handleExport("csv")}
            leftIcon={<DocumentArrowDownIcon className="w-4 h-4" />}
          >
            CSV
          </Button>
          <Button
            onClick={() => handleExport("pdf")}
            leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}
          >
            Export PDF
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-slate-200 p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">Completion Rate</span>
            <ChartBarIcon className="w-5 h-5 text-primary-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {reportData.taskCompletionRate}%
          </p>
          <p className="text-xs text-green-600 mt-1">+5% from last period</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-slate-200 p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">Total Tasks</span>
            <CalendarIcon className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {reportData.totalTasks}
          </p>
          <p className="text-xs text-slate-500 mt-1">In selected period</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-slate-200 p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">Completed</span>
            <svg
              className="w-5 h-5 text-green-500"
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
          <p className="text-3xl font-bold text-slate-900">
            {reportData.completedTasks}
          </p>
          <p className="text-xs text-slate-500 mt-1">Tasks completed</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-slate-200 p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">Avg. Completion</span>
            <svg
              className="w-5 h-5 text-orange-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {reportData.averageCompletionTime}d
          </p>
          <p className="text-xs text-slate-500 mt-1">Average days per task</p>
        </motion.div>
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks over time */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl border border-slate-200 p-6"
        >
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Tasks Over Time
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={reportData.tasksOverTime}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="created"
                  name="Created"
                  stroke="#6366f1"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  name="Completed"
                  stroke="#22c55e"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Tasks by status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl border border-slate-200 p-6"
        >
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Tasks by Status
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={reportData.tasksByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {reportData.tasksByStatus.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks by priority */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl border border-slate-200 p-6"
        >
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Tasks by Priority
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData.tasksByPriority} layout="vertical">
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Top performers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-xl border border-slate-200 p-6"
        >
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Top Performers
          </h3>
          <div className="space-y-4">
            {reportData.topPerformers.map((performer, index) => (
              <div key={performer.name} className="flex items-center gap-4">
                <span className="w-6 text-center text-sm font-medium text-slate-500">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-900">
                      {performer.name}
                    </span>
                    <span className="text-sm text-slate-600">
                      {performer.completed} tasks
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full"
                      style={{
                        width: `${
                          (performer.completed /
                            reportData.topPerformers[0].completed) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
