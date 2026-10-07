import { create } from 'zustand';
import { TaskItem, TaskPriority, TaskStatus } from '../types/task';

interface TaskState {
  tasks: TaskItem[];
  filter: 'all' | 'pending' | 'completed' | 'today';
  searchQuery: string;
  isDrawerOpen: boolean;

  addTask: (task: Omit<TaskItem, 'id' | 'createdAt'>) => TaskItem;
  updateTask: (id: string, updates: Partial<TaskItem>) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  setFilter: (filter: 'all' | 'pending' | 'completed' | 'today') => void;
  setSearchQuery: (query: string) => void;
  setDrawerOpen: (open: boolean) => void;
  setTasks: (tasks: TaskItem[]) => void;
  getPendingTasksCount: () => number;
  getTodayTasks: () => TaskItem[];
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [
    {
      id: 'task-demo-1',
      title: 'Practice Java DSA algorithms',
      description: 'Review Binary Trees, Graphs, and Dynamic Programming',
      dueDate: new Date().toISOString().split('T')[0],
      dueTime: '18:00',
      priority: 'high',
      status: 'pending',
      hasReminder: true,
      reminderTime: `${new Date().toISOString().split('T')[0]} 18:00`,
      createdAt: Date.now() - 3600000 * 4,
    },
    {
      id: 'task-demo-2',
      title: 'Review System Architecture with NEO',
      description: 'Test speech commands, memory vault, and 3D gestures',
      dueDate: new Date().toISOString().split('T')[0],
      dueTime: '15:30',
      priority: 'urgent',
      status: 'pending',
      hasReminder: true,
      reminderTime: `${new Date().toISOString().split('T')[0]} 15:30`,
      createdAt: Date.now() - 3600000 * 2,
    },
    {
      id: 'task-demo-3',
      title: 'Prepare project deployment scripts',
      description: 'Configure desktop companion package and shortcuts',
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      dueTime: '11:00',
      priority: 'medium',
      status: 'pending',
      hasReminder: false,
      createdAt: Date.now() - 3600000,
    }
  ],
  filter: 'all',
  searchQuery: '',
  isDrawerOpen: false,

  addTask: (taskData) => {
    const newTask: TaskItem = {
      ...taskData,
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
    };

    set((state) => {
      const updated = [newTask, ...state.tasks];
      try {
        localStorage.setItem('neo_tasks_backup', JSON.stringify(updated));
      } catch (e) {}
      return { tasks: updated };
    });

    return newTask;
  },

  updateTask: (id, updates) => {
    set((state) => {
      const updated = state.tasks.map((task) =>
        task.id === id
          ? {
              ...task,
              ...updates,
              completedAt:
                updates.status === 'completed' && task.status !== 'completed'
                  ? Date.now()
                  : updates.status === 'pending'
                  ? undefined
                  : task.completedAt,
            }
          : task
      );
      try {
        localStorage.setItem('neo_tasks_backup', JSON.stringify(updated));
      } catch (e) {}
      return { tasks: updated };
    });
  },

  toggleTask: (id) => {
    set((state) => {
      const updated = state.tasks.map((task) => {
        if (task.id !== id) return task;
        const newStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
        return {
          ...task,
          status: newStatus,
          completedAt: newStatus === 'completed' ? Date.now() : undefined,
        };
      });
      try {
        localStorage.setItem('neo_tasks_backup', JSON.stringify(updated));
      } catch (e) {}
      return { tasks: updated };
    });
  },

  deleteTask: (id) => {
    set((state) => {
      const updated = state.tasks.filter((task) => task.id !== id);
      try {
        localStorage.setItem('neo_tasks_backup', JSON.stringify(updated));
      } catch (e) {}
      return { tasks: updated };
    });
  },

  setFilter: (filter) => set({ filter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setDrawerOpen: (isDrawerOpen) => set({ isDrawerOpen }),
  setTasks: (tasks) => set({ tasks }),

  getPendingTasksCount: () => {
    return get().tasks.filter((t) => t.status === 'pending').length;
  },

  getTodayTasks: () => {
    const todayStr = new Date().toISOString().split('T')[0];
    return get().tasks.filter((t) => t.dueDate === todayStr);
  },
}));
