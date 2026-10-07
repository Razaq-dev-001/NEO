export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'completed' | 'in_progress';

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:MM
  priority: TaskPriority;
  status: TaskStatus;
  hasReminder: boolean;
  reminderTime?: string; // ISO string or YYYY-MM-DD HH:MM
  createdAt: number;
  completedAt?: number;
}
