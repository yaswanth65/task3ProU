import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FunnelIcon,
  Squares2X2Icon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { Task, useTaskStore } from "../stores/taskStore";
import { useAuthStore } from "../stores/authStore";
import KanbanBoard from "../components/tasks/KanbanBoard";
import CreateTaskModal from "../components/tasks/CreateTaskModal";
import EditTaskModal from "../components/tasks/EditTaskModal";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { StatusBadge, PriorityBadge } from "../components/ui/Badge";
import Avatar from "../components/ui/Avatar";
import { formatDate, cn } from "../lib/utils";

type ViewMode = "kanban" | "list";

export default function TasksPage() {
  const { taskId } = useParams<{ taskId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { tasks, loading, fetchTasks, updateTask, deleteTask } = useTaskStore();

  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [initialStatus, setInitialStatus] = useState<Task["status"]>("todo");

  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    assignee: "",
  });

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Handle taskId from URL params - open edit modal
  useEffect(() => {
    if (taskId && tasks.length > 0) {
      const task = tasks.find((t) => t._id === taskId);
      if (task) {
        setSelectedTask(task);
        setShowEditModal(true);
      }
    }
  }, [taskId, tasks]);

  // Close edit modal and navigate back to tasks
  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedTask(null);
    if (taskId) {
      navigate("/tasks");
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    // Search
    if (
      searchQuery &&
      !task.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !task.description?.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    // Status filter
    if (filters.status && task.status !== filters.status) {
      return false;
    }

    // Priority filter
    if (filters.priority && task.priority !== filters.priority) {
      return false;
    }

    // Assignee filter
    if (filters.assignee) {
      if (filters.assignee === "me" && task.assignee?._id !== user?._id) {
        return false;
      }
      if (filters.assignee === "unassigned" && task.assignee) {
        return false;
      }
    }

    return true;
  });

  const handleCreateTask = (status: Task["status"]) => {
    setInitialStatus(status);
    setShowCreateModal(true);
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setShowEditModal(true);
    navigate(`/tasks/${task._id}`);
  };

  const handleStatusChange = async (taskId: string, status: Task["status"]) => {
    await updateTask(taskId, { status });
  };

  const handleDelete = async (taskId: string) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      await deleteTask(taskId);
    }
  };

  const clearFilters = () => {
    setFilters({ status: "", priority: "", assignee: "" });
    setSearchQuery("");
  };

  const hasActiveFilters =
    filters.status || filters.priority || filters.assignee || searchQuery;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
          <p className="text-slate-600">
            {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}{" "}
            {hasActiveFilters && "(filtered)"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode("kanban")}
              className={cn(
                "p-2 rounded-md transition-colors",
                viewMode === "kanban"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Squares2X2Icon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2 rounded-md transition-colors",
                viewMode === "list"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <ListBulletIcon className="w-5 h-5" />
            </button>
          </div>

          <Button
            onClick={() => setShowCreateModal(true)}
            leftIcon={<PlusIcon className="w-4 h-4" />}
          >
            New Task
          </Button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<MagnifyingGlassIcon className="w-5 h-5" />}
          />
        </div>

        <Button
          variant={showFilters ? "secondary" : "ghost"}
          onClick={() => setShowFilters(!showFilters)}
          leftIcon={<FunnelIcon className="w-4 h-4" />}
        >
          Filters
          {hasActiveFilters && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary-500 text-white rounded-full">
              {[filters.status, filters.priority, filters.assignee].filter(
                Boolean
              ).length + (searchQuery ? 1 : 0)}
            </span>
          )}
        </Button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-white rounded-lg border border-slate-200 p-4 mb-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, status: e.target.value }))
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All statuses</option>
                <option value="backlog">Backlog</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="done">Done</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Priority
              </label>
              <select
                value={filters.priority}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, priority: e.target.value }))
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Assignee
              </label>
              <select
                value={filters.assignee}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, assignee: e.target.value }))
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All assignees</option>
                <option value="me">Assigned to me</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <button
                onClick={clearFilters}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Clear all filters
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Content */}
      <div className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : viewMode === "kanban" ? (
          <KanbanBoard
            tasks={filteredTasks}
            onCreateTask={handleCreateTask}
            onEditTask={handleEditTask}
          />
        ) : (
          // List view
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                    Task
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                    Priority
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                    Due Date
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                    Assignee
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTasks.map((task) => (
                  <tr
                    key={task._id}
                    onClick={() => handleEditTask(task)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="max-w-xs">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {task.title}
                        </p>
                        {task.tags && task.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {task.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="px-1.5 py-0.5 text-xs bg-slate-100 text-slate-600 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={task.priority} />
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {task.dueDate ? formatDate(task.dueDate) : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {task.assignee ? (
                        <div className="flex items-center gap-2">
                          <Avatar
                            src={task.assignee.avatar}
                            firstName={task.assignee.firstName}
                            lastName={task.assignee.lastName}
                            size="xs"
                          />
                          <span className="text-sm text-slate-600">
                            {task.assignee.firstName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">
                          Unassigned
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredTasks.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <p className="text-slate-500">No tasks found</p>
                      {hasActiveFilters && (
                        <button
                          onClick={clearFilters}
                          className="mt-2 text-sm text-primary-600 hover:text-primary-700"
                        >
                          Clear filters
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create task modal */}
      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        initialData={{ status: initialStatus }}
      />

      {/* Edit task modal */}
      <EditTaskModal
        isOpen={showEditModal}
        onClose={handleCloseEditModal}
        task={selectedTask}
      />
    </div>
  );
}
