import { useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import {
  XMarkIcon,
  PaperClipIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import Button from "../ui/Button";
import Input from "../ui/Input";
import { useTaskStore } from "../../stores/taskStore";
import { useAuthStore } from "../../stores/authStore";
import { api } from "../../lib/api";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    status?: string;
    dueDate?: Date;
    assigneeId?: string;
  };
}

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role?: string;
  department?: string;
  position?: string;
}

export default function CreateTaskModal({
  isOpen,
  onClose,
  initialData,
}: CreateTaskModalProps) {
  const { createTask } = useTaskStore();
  const { user: currentUser } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [files, setFiles] = useState<File[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    status: initialData?.status || "todo",
    dueDate: initialData?.dueDate
      ? new Date(initialData.dueDate).toISOString().split("T")[0]
      : "",
    assignee: initialData?.assigneeId || "",
    tags: "",
  });

  // Fetch users for assignment
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get("/users");
        // API returns { data: users[], pagination: {...} }
        const usersList = response.data.data || response.data.users || [];
        setUsers(usersList);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };

    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        status: "todo",
        dueDate: "",
        assignee: "",
        tags: "",
      });
      setFiles([]);
    } else if (initialData) {
      setFormData((prev) => ({
        ...prev,
        status: initialData.status || prev.status,
        dueDate: initialData.dueDate
          ? new Date(initialData.dueDate).toISOString().split("T")[0]
          : prev.dueDate,
        assignee: initialData.assigneeId || prev.assignee,
      }));
    }
  }, [isOpen, initialData]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) return;

    setLoading(true);
    try {
      // Prepare task data
      const taskData: any = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        status: formData.status,
      };

      if (formData.dueDate) {
        taskData.dueDate = new Date(formData.dueDate).toISOString();
      }

      if (formData.assignee) {
        taskData.assignee = formData.assignee;
      }

      if (formData.tags.trim()) {
        taskData.tags = formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean);
      }

      // Create task
      await createTask(taskData);

      // Upload attachments if any
      // TODO: Implement file upload after task creation

      onClose();
    } catch (error) {
      console.error("Failed to create task:", error);
    } finally {
      setLoading(false);
    }
  };

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
              <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                  <Dialog.Title className="text-lg font-semibold text-slate-900">
                    Create New Task
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Form */}
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
                        </select>
                      </div>
                    </div>

                    {/* Due Date */}
                    <Input
                      label="Due Date"
                      name="dueDate"
                      type="date"
                      value={formData.dueDate}
                      onChange={handleChange}
                    />

                    {/* Assignee - organized by role for managers */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Assign To
                      </label>
                      <select
                        name="assignee"
                        value={formData.assignee}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">Unassigned</option>

                        {/* Self-assignment option */}
                        {currentUser && (
                          <optgroup label="Assign to Myself">
                            <option value={currentUser._id}>
                              {currentUser.firstName} {currentUser.lastName}{" "}
                              (Me)
                            </option>
                          </optgroup>
                        )}

                        {/* Team members (excluding current user) */}
                        {users.filter((u) => u._id !== currentUser?._id)
                          .length > 0 && (
                          <optgroup label="Assign to Team Member">
                            {users
                              .filter((u) => u._id !== currentUser?._id)
                              .map((user) => (
                                <option key={user._id} value={user._id}>
                                  {user.firstName} {user.lastName}
                                  {user.position ? ` - ${user.position}` : ""}
                                </option>
                              ))}
                          </optgroup>
                        )}
                      </select>
                      {currentUser?.role === "manager" ? (
                        <p className="mt-1 text-xs text-slate-500">
                          As a manager, you can assign tasks to yourself or any
                          team member
                        </p>
                      ) : null}
                    </div>

                    {/* Tags */}
                    <Input
                      label="Tags"
                      name="tags"
                      value={formData.tags}
                      onChange={handleChange}
                      placeholder="Enter tags separated by commas..."
                    />

                    {/* File attachments */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Attachments
                      </label>
                      <div className="border-2 border-dashed border-slate-200 rounded-lg p-4">
                        <input
                          type="file"
                          multiple
                          onChange={handleFileChange}
                          className="hidden"
                          id="file-upload"
                        />
                        <label
                          htmlFor="file-upload"
                          className="flex flex-col items-center cursor-pointer"
                        >
                          <PaperClipIcon className="w-8 h-8 text-slate-400 mb-2" />
                          <span className="text-sm text-slate-600">
                            Click to attach files
                          </span>
                          <span className="text-xs text-slate-400 mt-1">
                            Max 10MB per file
                          </span>
                        </label>
                      </div>

                      {/* File list */}
                      {files.length > 0 && (
                        <ul className="mt-3 space-y-2">
                          {files.map((file, index) => (
                            <li
                              key={index}
                              className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg"
                            >
                              <span className="text-sm text-slate-700 truncate">
                                {file.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeFile(index)}
                                className="p-1 text-slate-400 hover:text-red-500"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
                    <Button variant="ghost" onClick={onClose} type="button">
                      Cancel
                    </Button>
                    <Button type="submit" isLoading={loading}>
                      Create Task
                    </Button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
