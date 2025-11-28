import { create } from 'zustand';
import api from '../lib/api';

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'archived';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TaskAssignee {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
}

export interface TaskComment {
  _id: string;
  content: string;
  author: TaskAssignee;
  mentions: TaskAssignee[];
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
}

export interface TaskAttachment {
  _id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  uploadedBy: TaskAssignee;
  uploadedAt: string;
}

export interface TaskActivity {
  _id: string;
  type: string;
  actor: TaskAssignee;
  description: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignees: TaskAssignee[];
  createdBy: TaskAssignee;
  dueDate?: string;
  startDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  tags: string[];
  attachments: TaskAttachment[];
  comments: TaskComment[];
  activities: TaskActivity[];
  subtasks: Task[];
  parentTask?: { _id: string; title: string; status: TaskStatus };
  completedAt?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface TaskFilters {
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  assignee?: string;
  tags?: string[];
  search?: string;
  overdue?: boolean;
}

interface TaskState {
  tasks: Task[];
  currentTask: Task | null;
  isLoading: boolean;
  error: string | null;
  filters: TaskFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  
  // Actions
  fetchTasks: (filters?: TaskFilters) => Promise<void>;
  fetchMyTasks: () => Promise<void>;
  fetchTaskById: (taskId: string) => Promise<void>;
  createTask: (data: Partial<Task>) => Promise<Task>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<Task>;
  deleteTask: (taskId: string) => Promise<void>;
  addComment: (taskId: string, content: string, mentions?: string[]) => Promise<void>;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  setFilters: (filters: TaskFilters) => void;
  clearCurrentTask: () => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  currentTask: null,
  isLoading: false,
  error: null,
  filters: {},
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  },
  
  fetchTasks: async (filters?: TaskFilters) => {
    set({ isLoading: true, error: null });
    try {
      const currentFilters = filters || get().filters;
      const params = new URLSearchParams();
      
      if (currentFilters.status) {
        params.append('status', Array.isArray(currentFilters.status) 
          ? currentFilters.status.join(',') 
          : currentFilters.status);
      }
      if (currentFilters.priority) {
        params.append('priority', Array.isArray(currentFilters.priority)
          ? currentFilters.priority.join(',')
          : currentFilters.priority);
      }
      if (currentFilters.assignee) params.append('assignee', currentFilters.assignee);
      if (currentFilters.tags?.length) params.append('tags', currentFilters.tags.join(','));
      if (currentFilters.search) params.append('search', currentFilters.search);
      if (currentFilters.overdue) params.append('overdue', 'true');
      
      const response = await api.get(`/tasks?${params.toString()}`);
      
      set({
        tasks: response.data.data,
        pagination: response.data.pagination,
        filters: currentFilters,
        isLoading: false,
      });
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to fetch tasks';
      set({ error: message, isLoading: false });
    }
  },
  
  fetchMyTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/tasks/my');
      set({
        tasks: response.data.data,
        pagination: response.data.pagination,
        isLoading: false,
      });
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to fetch tasks';
      set({ error: message, isLoading: false });
    }
  },
  
  fetchTaskById: async (taskId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/tasks/${taskId}`);
      set({ currentTask: response.data.task, isLoading: false });
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to fetch task';
      set({ error: message, isLoading: false });
    }
  },
  
  createTask: async (data: Partial<Task>) => {
    try {
      const response = await api.post('/tasks', data);
      const newTask = response.data.task;
      
      set((state) => ({
        tasks: [newTask, ...state.tasks],
      }));
      
      return newTask;
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create task';
      throw new Error(message);
    }
  },
  
  updateTask: async (taskId: string, updates: Partial<Task>) => {
    try {
      const response = await api.patch(`/tasks/${taskId}`, updates);
      const updatedTask = response.data.task;
      
      set((state) => ({
        tasks: state.tasks.map((t) => (t._id === taskId ? updatedTask : t)),
        currentTask: state.currentTask?._id === taskId ? updatedTask : state.currentTask,
      }));
      
      return updatedTask;
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to update task';
      throw new Error(message);
    }
  },
  
  deleteTask: async (taskId: string) => {
    try {
      await api.delete(`/tasks/${taskId}`);
      
      set((state) => ({
        tasks: state.tasks.filter((t) => t._id !== taskId),
        currentTask: state.currentTask?._id === taskId ? null : state.currentTask,
      }));
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to delete task';
      throw new Error(message);
    }
  },
  
  addComment: async (taskId: string, content: string, mentions?: string[]) => {
    try {
      const response = await api.post(`/tasks/${taskId}/comments`, { content, mentions });
      const updatedTask = response.data.task;
      
      set((state) => ({
        tasks: state.tasks.map((t) => (t._id === taskId ? updatedTask : t)),
        currentTask: state.currentTask?._id === taskId ? updatedTask : state.currentTask,
      }));
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to add comment';
      throw new Error(message);
    }
  },
  
  updateTaskStatus: async (taskId: string, status: TaskStatus) => {
    try {
      const response = await api.patch(`/tasks/${taskId}`, { status });
      const updatedTask = response.data.task;
      
      set((state) => ({
        tasks: state.tasks.map((t) => (t._id === taskId ? updatedTask : t)),
        currentTask: state.currentTask?._id === taskId ? updatedTask : state.currentTask,
      }));
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to update status';
      throw new Error(message);
    }
  },
  
  setFilters: (filters: TaskFilters) => {
    set({ filters });
    get().fetchTasks(filters);
  },
  
  clearCurrentTask: () => set({ currentTask: null }),
}));
