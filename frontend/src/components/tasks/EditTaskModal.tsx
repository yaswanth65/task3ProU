import { useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { XMarkIcon, TrashIcon } from "@heroicons/react/24/outline";
import Button from "../ui/Button";
import Input from "../ui/Input";
import { Task, TaskStatus, useTaskStore } from "../../stores/taskStore";
import { api } from "../../lib/api";
import { StatusBadge, PriorityBadge } from "../ui/Badge";
import Avatar from "../ui/Avatar";
import { formatDate } from "../../lib/utils";

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
}

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
}

export default function EditTaskModal({
  isOpen,
  onClose,
  task,
}: EditTaskModalProps) {
  const { updateTask, deleteTask } = useTaskStore();

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    status: "todo",
    dueDate: "",
    assignee: "",
    tags: "",
  });

  // Fetch users for assignment
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get("/users");
        setUsers(response.data.users || []);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };

    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  // Populate form when task changes
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || "",
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate
          ? new Date(task.dueDate).toISOString().split("T")[0]
          : "",
        assignee: task.assignees?.[0]?._id || "",
        tags: task.tags?.join(", ") || "",
      });
    }
  }, [task]);

  // Reset editing state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
    }
  }, [isOpen]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !task) return;

    setLoading(true);
    try {
      const taskData: any = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        status: formData.status,
      };

      if (formData.dueDate) {
        taskData.dueDate = new Date(formData.dueDate).toISOString();
      } else {
        taskData.dueDate = null;
      }

      if (formData.assignee) {
        taskData.assignee = formData.assignee;
      } else {
        taskData.assignee = null;
      }

      if (formData.tags.trim()) {
        taskData.tags = formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean);
      } else {
        taskData.tags = [];
      }

      await updateTask(task._id, taskData);
      setIsEditing(false);
      onClose();
    } catch (error) {
      console.error("Failed to update task:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;

    if (window.confirm("Are you sure you want to delete this task?")) {
      setDeleting(true);
      try {
        await deleteTask(task._id);
        onClose();
      } catch (error) {
        console.error("Failed to delete task:", error);
      } finally {
        setDeleting(false);
      }
    }
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!task) return;

    try {
      await updateTask(task._id, { status: newStatus });
      setFormData((prev) => ({ ...prev, status: newStatus }));
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  // Get the first assignee (primary)
  const primaryAssignee = task?.assignees?.[0];

  if (!task) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                  <Dialog.Title className="text-lg font-semibold text-slate-900">
                    {isEditing ? "Edit Task" : "Task Details"}
                  </Dialog.Title>
                  <div className="flex items-center gap-2">
                    {!isEditing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                      >
                        Edit
                      </Button>
                    )}
                    <button
                      onClick={onClose}
                      className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  /* Edit Form */
                  <form onSubmit={handleSubmit}>
                    <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                      {/* Title */}
                      <Input
                        label="Task Title"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        placeholder="Enter task title..."
                        required
                      />

                      {/* Description */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          Description
                        </label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleChange}
                          placeholder="Add a detailed description..."
                          rows={3}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                        />
                      </div>

                      {/* Priority & Status */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Priority
                          </label>
                          <select
                            name="priority"
                            value={formData.priority}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Status
                          </label>
                          <select
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          >
                            <option value="backlog">Backlog</option>
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="in_review">In Review</option>
                            <option value="done">Done</option>
                            <option value="archived">Archived</option>
                          </select>
                        </div>
                      </div>

                      {/* Due Date & Assignee */}
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="Due Date"
                          name="dueDate"
                          type="date"
                          value={formData.dueDate}
                          onChange={handleChange}
                        />
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Assignee
                          </label>
                          <select
                            name="assignee"
                            value={formData.assignee}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          >
                            <option value="">Unassigned</option>
                            {users.map((user) => (
                              <option key={user._id} value={user._id}>
                                {user.firstName} {user.lastName}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Tags */}
                      <Input
                        label="Tags"
                        name="tags"
                        value={formData.tags}
                        onChange={handleChange}
                        placeholder="Enter tags separated by commas..."
                      />
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
                      <Button
                        variant="ghost"
                        onClick={handleDelete}
                        type="button"
                        isLoading={deleting}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <TrashIcon className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          onClick={() => setIsEditing(false)}
                          type="button"
                        >
                          Cancel
                        </Button>
                        <Button type="submit" isLoading={loading}>
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  </form>
                ) : (
                  /* View Mode */
                  <div>
                    <div className="px-6 py-4 space-y-6 max-h-[60vh] overflow-y-auto">
                      {/* Title */}
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900">
                          {task.title}
                        </h2>
                        {task.description && (
                          <p className="mt-2 text-slate-600">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Status & Priority Badges */}
                      <div className="flex items-center gap-3">
                        <StatusBadge status={task.status} />
                        <PriorityBadge priority={task.priority} />
                      </div>

                      {/* Quick Status Change */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Change Status
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {(
                            [
                              "todo",
                              "in_progress",
                              "in_review",
                              "done",
                            ] as const
                          ).map((status) => (
                            <button
                              key={status}
                              onClick={() => handleStatusChange(status)}
                              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                                formData.status === status
                                  ? "bg-primary-100 text-primary-700 ring-2 ring-primary-500"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              {status === "todo"
                                ? "To Do"
                                : status === "in_progress"
                                ? "In Progress"
                                : status === "in_review"
                                ? "In Review"
                                : "Done"}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Due Date */}
                        <div>
                          <label className="block text-sm font-medium text-slate-500 mb-1">
                            Due Date
                          </label>
                          <p className="text-slate-900">
                            {task.dueDate
                              ? formatDate(task.dueDate)
                              : "No due date"}
                          </p>
                        </div>

                        {/* Assignee */}
                        <div>
                          <label className="block text-sm font-medium text-slate-500 mb-1">
                            Assignee
                          </label>
                          {primaryAssignee ? (
                            <div className="flex items-center gap-2">
                              <Avatar
                                src={primaryAssignee.avatar}
                                firstName={primaryAssignee.firstName}
                                lastName={primaryAssignee.lastName}
                                size="sm"
                              />
                              <span className="text-slate-900">
                                {primaryAssignee.firstName}{" "}
                                {primaryAssignee.lastName}
                              </span>
                            </div>
                          ) : (
                            <p className="text-slate-400">Unassigned</p>
                          )}
                        </div>

                        {/* Created By */}
                        <div>
                          <label className="block text-sm font-medium text-slate-500 mb-1">
                            Created By
                          </label>
                          {task.createdBy ? (
                            <div className="flex items-center gap-2">
                              <Avatar
                                src={task.createdBy.avatar}
                                firstName={task.createdBy.firstName}
                                lastName={task.createdBy.lastName}
                                size="sm"
                              />
                              <span className="text-slate-900">
                                {task.createdBy.firstName}{" "}
                                {task.createdBy.lastName}
                              </span>
                            </div>
                          ) : (
                            <p className="text-slate-400">Unknown</p>
                          )}
                        </div>

                        {/* Created At */}
                        <div>
                          <label className="block text-sm font-medium text-slate-500 mb-1">
                            Created
                          </label>
                          <p className="text-slate-900">
                            {formatDate(task.createdAt)}
                          </p>
                        </div>
                      </div>

                      {/* Tags */}
                      {task.tags && task.tags.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-slate-500 mb-2">
                            Tags
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {task.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-1 text-sm bg-slate-100 text-slate-600 rounded-lg"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
                      <Button
                        variant="ghost"
                        onClick={handleDelete}
                        isLoading={deleting}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <TrashIcon className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                      <Button onClick={() => setIsEditing(true)}>
                        Edit Task
                      </Button>
                    </div>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
