import { useTaskStore } from '../state/taskStore';
import { useSettingsStore } from '../state/settingsStore';
import { soundFx } from './audioSynthesizer';
import { speechService } from './speechService';
import { useRobotStore } from '../state/robotStore';

class ReminderService {
  private intervalId: any = null;
  private triggeredReminderIds: Set<string> = new Set();

  start() {
    this.requestNotificationPermission();

    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = setInterval(() => {
      this.checkReminders();
    }, 12000); // Check every 12 seconds
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async requestNotificationPermission() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        try {
          await Notification.requestPermission();
        } catch (e) {}
      }
    }
  }

  private checkReminders() {
    const tasks = useTaskStore.getState().tasks;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    for (const task of tasks) {
      if (task.status === 'completed' || !task.hasReminder) continue;
      if (this.triggeredReminderIds.has(task.id)) continue;

      let isDue = false;

      // Match due date + time
      if (task.dueDate === todayStr && task.dueTime) {
        if (task.dueTime <= currentTimeStr) {
          isDue = true;
        }
      } else if (task.reminderTime) {
        if (task.reminderTime.includes('T') || task.reminderTime.includes(' ')) {
          const remDate = new Date(task.reminderTime);
          if (!isNaN(remDate.getTime()) && now.getTime() >= remDate.getTime()) {
            isDue = true;
          }
        }
      }

      if (isDue) {
        this.triggerReminder(task);
        break; // trigger one at a time to prevent audio overlap
      }
    }
  }

  private triggerReminder(task: any) {
    this.triggeredReminderIds.add(task.id);

    const userName = useSettingsStore.getState().userName || 'Friend';
    const message = `Reminder for ${userName}: "${task.title}". ${task.description || ''}`;

    // 1. Play sound chime
    soundFx.playSuccessPing();

    // 2. Animate robot
    useRobotStore.getState().triggerAction('nod');
    useRobotStore.getState().setEmotionState('excited');

    // 3. Desktop Native Notification
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('NEO Task Reminder', {
          body: `${task.title}\n${task.description || ''}`,
          icon: '/favicon.ico',
        });
      } catch (e) {}
    }

    // 4. Speak reminder
    speechService.speak(message);
  }
}

export const reminderService = new ReminderService();
