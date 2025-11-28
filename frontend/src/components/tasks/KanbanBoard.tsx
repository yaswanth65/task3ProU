import { useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { PlusIcon } from "@heroicons/react/24/outline";
import { Task, useTaskStore } from "../../stores/taskStore";
import TaskCard from "./TaskCard";
import Button from "../ui/Button";
import { cn } from "../../lib/utils";

interface KanbanBoardProps {
  tasks: Task[];
  onCreateTask?: (status: Task["status"]) => void;
  onEditTask?: (task: Task) => void;
}

interface Column {
  id: Task["status"];
  title: string;
  color: string;
}

const columns: Column[] = [
  { id: "todo", title: "To Do", color: "bg-slate-500" },
  { id: "in_progress", title: "In Progress", color: "bg-blue-500" },
  { id: "in_review", title: "In Review", color: "bg-yellow-500" },
  { id: "done", title: "Done", color: "bg-green-500" },
];

export default function KanbanBoard({
  tasks,
  onCreateTask,
  onEditTask,
}: KanbanBoardProps) {
  const { updateTask, deleteTask } = useTaskStore();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<Task["status"], Task[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
      archived: [],
    };

    tasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    // Sort by order within each column
    Object.keys(grouped).forEach((status) => {
      grouped[status as Task["status"]].sort((a, b) => a.order - b.order);
    });

    return grouped;
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t._id === event.active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // Optional: Handle drag over for visual feedback
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the task being dragged
    const draggedTask = tasks.find((t) => t._id === activeId);
    if (!draggedTask) return;

    // Check if dropped over a column
    const isOverColumn = columns.some((col) => col.id === overId);

    if (isOverColumn) {
      // Dropped directly on a column
      const newStatus = overId as Task["status"];
      if (draggedTask.status !== newStatus) {
        await updateTask(activeId, { status: newStatus });
      }
    } else {
      // Dropped on another task
      const overTask = tasks.find((t) => t._id === overId);
      if (overTask && draggedTask.status !== overTask.status) {
        await updateTask(activeId, { status: overTask.status });
      }
    }
  };

  const handleStatusChange = async (taskId: string, status: Task["status"]) => {
    await updateTask(taskId, { status });
  };

  const handleDelete = async (taskId: string) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      await deleteTask(taskId);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
        {columns.map((column) => (
          <div
            key={column.id}
            className="flex flex-col bg-slate-50 rounded-xl p-3"
          >
            {/* Column header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", column.color)} />
                <h3 className="font-medium text-slate-900">{column.title}</h3>
                <span className="px-2 py-0.5 text-xs font-medium bg-slate-200 rounded-full">
                  {tasksByStatus[column.id].length}
                </span>
              </div>
              <button
                onClick={() => onCreateTask?.(column.id)}
                className="p-1 rounded hover:bg-slate-200 transition-colors"
              >
                <PlusIcon className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Tasks */}
            <SortableContext
              items={tasksByStatus[column.id].map((t) => t._id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex-1 space-y-3 min-h-[200px]">
                {tasksByStatus[column.id].map((task) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    onEdit={onEditTask}
                    onDelete={handleDelete}
                    onStatusChange={handleStatusChange}
                  />
                ))}

                {tasksByStatus[column.id].length === 0 && (
                  <div className="flex items-center justify-center h-32 border-2 border-dashed border-slate-200 rounded-lg">
                    <p className="text-sm text-slate-400">No tasks</p>
                  </div>
                )}
              </div>
            </SortableContext>

            {/* Add task button */}
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 w-full justify-center"
              onClick={() => onCreateTask?.(column.id)}
              leftIcon={<PlusIcon className="w-4 h-4" />}
            >
              Add Task
            </Button>
          </div>
        ))}
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} isDragging />}
      </DragOverlay>
    </DndContext>
  );
}
