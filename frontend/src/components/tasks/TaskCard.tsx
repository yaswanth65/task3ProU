import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarIcon,
  ChatBubbleLeftIcon,
  PaperClipIcon,
  EllipsisHorizontalIcon,
} from "@heroicons/react/24/outline";
import { Menu, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { Task } from "../../stores/taskStore";
import Avatar from "../ui/Avatar";
import { PriorityBadge } from "../ui/Badge";
import { formatDate, isOverdue, cn } from "../../lib/utils";

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onStatusChange?: (taskId: string, status: Task["status"]) => void;
  isDragging?: boolean;
}

export default function TaskCard({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  isDragging,
}: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSorting,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const overdue = useMemo(
    () => task.dueDate && isOverdue(task.dueDate) && task.status !== "done",
    [task.dueDate, task.status]
  );

  const statuses: { value: Task["status"]; label: string }[] = [
    { value: "todo", label: "To Do" },
    { value: "in_progress", label: "In Progress" },
    { value: "in_review", label: "In Review" },
    { value: "done", label: "Done" },
  ];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group bg-white rounded-lg border border-slate-200 p-4 cursor-grab hover:shadow-md transition-shadow",
        isSorting && "opacity-50",
        isDragging && "shadow-xl rotate-2"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <Link
          to={`/tasks/${task._id}`}
          className="text-sm font-medium text-slate-900 hover:text-primary-600 line-clamp-2 flex-1"
        >
          {task.title}
        </Link>

        <Menu as="div" className="relative">
          <Menu.Button className="p-1 rounded hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
            <EllipsisHorizontalIcon className="w-4 h-4 text-slate-500" />
          </Menu.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 z-10 mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-100 py-1 focus:outline-none">
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={() => onEdit?.(task)}
                    className={cn(
                      "w-full px-4 py-2 text-left text-sm",
                      active ? "bg-slate-100" : ""
                    )}
                  >
                    Edit task
                  </button>
                )}
              </Menu.Item>

              <div className="border-t border-slate-100 my-1" />

              {statuses
                .filter((s) => s.value !== task.status)
                .map((status) => (
                  <Menu.Item key={status.value}>
                    {({ active }) => (
                      <button
                        onClick={() => onStatusChange?.(task._id, status.value)}
                        className={cn(
                          "w-full px-4 py-2 text-left text-sm",
                          active ? "bg-slate-100" : ""
                        )}
                      >
                        Move to {status.label}
                      </button>
                    )}
                  </Menu.Item>
                ))}

              <div className="border-t border-slate-100 my-1" />

              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={() => onDelete?.(task._id)}
                    className={cn(
                      "w-full px-4 py-2 text-left text-sm text-red-600",
                      active ? "bg-red-50" : ""
                    )}
                  >
                    Delete task
                  </button>
                )}
              </Menu.Item>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>

      {/* Description preview */}
      {task.description && (
        <p className="text-xs text-slate-500 line-clamp-2 mb-3">
          {task.description}
        </p>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600"
            >
              {tag}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
              +{task.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PriorityBadge priority={task.priority} />

          {task.dueDate && (
            <div
              className={cn(
                "flex items-center gap-1 text-xs",
                overdue ? "text-red-600" : "text-slate-500"
              )}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              {formatDate(task.dueDate)}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Comments count */}
          {task.comments && task.comments.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <ChatBubbleLeftIcon className="w-3.5 h-3.5" />
              {task.comments.length}
            </div>
          )}

          {/* Attachments count */}
          {task.attachments && task.attachments.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <PaperClipIcon className="w-3.5 h-3.5" />
              {task.attachments.length}
            </div>
          )}

          {/* Assignee */}
          {task.assignees && task.assignees.length > 0 && (
            <Avatar
              src={task.assignees[0].avatar}
              firstName={task.assignees[0].firstName}
              lastName={task.assignees[0].lastName}
              size="xs"
            />
          )}
        </div>
      </div>
    </div>
  );
}
