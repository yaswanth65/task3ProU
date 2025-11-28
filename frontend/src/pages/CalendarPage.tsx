import { useEffect, useMemo, useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
} from "date-fns";
import { motion } from "framer-motion";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { Task, useTaskStore } from "../stores/taskStore";
import CreateTaskModal from "../components/tasks/CreateTaskModal";
import Button from "../components/ui/Button";
import { PriorityBadge, StatusBadge } from "../components/ui/Badge";
import { cn } from "../lib/utils";

export default function CalendarPage() {
  const { tasks, fetchTasks, loading } = useTaskStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Get days for calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, Task[]> = {};

    tasks.forEach((task) => {
      if (task.dueDate) {
        const dateKey = format(new Date(task.dueDate), "yyyy-MM-dd");
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(task);
      }
    });

    return grouped;
  }, [tasks]);

  // Get tasks for selected date
  const selectedDateTasks = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    return tasksByDate[dateKey] || [];
  }, [selectedDate, tasksByDate]);

  const goToPrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const handleCreateTask = () => {
    setShowCreateModal(true);
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6">
      {/* Calendar */}
      <div className="flex-1">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          {/* Calendar header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-slate-900">
                {format(currentDate, "MMMM yyyy")}
              </h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={goToPrevMonth}
                  className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={goToNextMonth}
                  className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <ChevronRightIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={goToToday}>
                Today
              </Button>
              <Button
                onClick={handleCreateTask}
                leftIcon={<PlusIcon className="w-4 h-4" />}
              >
                Add Task
              </Button>
            </div>
          </div>

          {/* Week days header */}
          <div className="grid grid-cols-7 mb-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-slate-500 uppercase py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dayTasks = tasksByDate[dateKey] || [];
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);

              return (
                <motion.button
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.005 }}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "min-h-[100px] p-2 rounded-lg text-left transition-colors",
                    isCurrentMonth
                      ? "bg-slate-50 hover:bg-slate-100"
                      : "bg-slate-25 text-slate-400",
                    isSelected && "ring-2 ring-primary-500 bg-primary-50",
                    isTodayDate && !isSelected && "bg-blue-50"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={cn(
                        "text-sm font-medium",
                        isTodayDate && "text-primary-600",
                        !isCurrentMonth && "text-slate-400"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    {dayTasks.length > 0 && (
                      <span className="text-xs text-slate-500">
                        {dayTasks.length}
                      </span>
                    )}
                  </div>

                  {/* Task previews */}
                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map((task) => (
                      <div
                        key={task._id}
                        className={cn(
                          "text-xs truncate px-1.5 py-0.5 rounded",
                          task.priority === "urgent"
                            ? "bg-red-100 text-red-700"
                            : task.priority === "high"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-slate-100 text-slate-700"
                        )}
                      >
                        {task.title}
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-xs text-slate-500 px-1.5">
                        +{dayTasks.length - 3} more
                      </div>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sidebar - Selected date details */}
      <div className="lg:w-80">
        <div className="bg-white rounded-xl border border-slate-200 sticky top-20">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">
              {selectedDate
                ? format(selectedDate, "EEEE, MMMM d")
                : "Select a date"}
            </h3>
            {selectedDate && (
              <p className="text-sm text-slate-500 mt-1">
                {selectedDateTasks.length} task
                {selectedDateTasks.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          {selectedDate ? (
            <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
              {selectedDateTasks.length > 0 ? (
                selectedDateTasks.map((task) => (
                  <div key={task._id} className="p-4 hover:bg-slate-50">
                    <p className="text-sm font-medium text-slate-900 mb-2">
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={task.status} />
                      <PriorityBadge priority={task.priority} />
                    </div>
                    {task.description && (
                      <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 mb-4">
                    No tasks for this date
                  </p>
                  <Button
                    size="sm"
                    onClick={handleCreateTask}
                    leftIcon={<PlusIcon className="w-4 h-4" />}
                  >
                    Add Task
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center">
              <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                Click on a date to see tasks
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create task modal */}
      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        initialData={selectedDate ? { dueDate: selectedDate } : undefined}
      />
    </div>
  );
}
