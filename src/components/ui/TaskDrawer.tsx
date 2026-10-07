import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Calendar,
  Clock,
  Bell,
  Volume2,
  AlertCircle,
  Search,
} from 'lucide-react';
import { useTaskStore } from '../../state/taskStore';
import { useSettingsStore } from '../../state/settingsStore';
import { speechService } from '../../services/speechService';
import { soundFx } from '../../services/audioSynthesizer';
import { TaskPriority } from '../../types/task';

export const TaskDrawer: React.FC = () => {
  const activeDrawer = useSettingsStore((s) => s.activeDrawer);
  const toggleDrawer = useSettingsStore((s) => s.toggleDrawer);

  const tasks = useTaskStore((s) => s.tasks);
  const filter = useTaskStore((s) => s.filter);
  const setFilter = useTaskStore((s) => s.setFilter);
  const addTask = useTaskStore((s) => s.addTask);
  const toggleTask = useTaskStore((s) => s.toggleTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);

  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDueDate, setNewDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [newDueTime, setNewDueTime] = useState('18:00');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [hasReminder, setHasReminder] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  if (activeDrawer !== 'tasks') return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    soundFx.playSuccessPing();
    addTask({
      title: newTitle.trim(),
      description: newDesc.trim(),
      dueDate: newDueDate,
      dueTime: newDueTime || undefined,
      priority: newPriority,
      status: 'pending',
      hasReminder: hasReminder,
      reminderTime: hasReminder && newDueTime ? `${newDueDate} ${newDueTime}` : undefined,
    });

    setNewTitle('');
    setNewDesc('');
    setIsAdding(false);
  };

  const handleReadSchedule = () => {
    soundFx.playWakeChime();
    const pending = tasks.filter((t) => t.status === 'pending');
    if (pending.length === 0) {
      speechService.speak('You have no pending tasks scheduled! Your day is wide open.');
      return;
    }
    const scheduleStr = pending
      .map((t, idx) => `Task ${idx + 1}: ${t.title} at ${t.dueTime || 'some point today'}`)
      .join('. ');
    speechService.speak(`Here is your schedule for today: ${scheduleStr}`);
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'pending') return t.status === 'pending';
    if (filter === 'completed') return t.status === 'completed';
    if (filter === 'today') return t.dueDate === new Date().toISOString().split('T')[0];
    return true;
  }).filter((t) => t.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const getPriorityColor = (p: TaskPriority) => {
    switch (p) {
      case 'urgent':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'high':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'medium':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 380 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 380 }}
        transition={{ type: 'spring', damping: 25, stiffness: 280 }}
        className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-[#0e1422]/95 backdrop-blur-2xl border-l border-white/[0.08] shadow-2xl z-40 flex flex-col"
      >
        {/* Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <span>Daily Tasks & Schedule</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              {tasks.filter((t) => t.status === 'pending').length} pending • {tasks.length} total
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleReadSchedule}
              className="p-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition-all text-xs flex items-center space-x-1"
              title="Read Schedule Aloud"
            >
              <Volume2 className="w-4 h-4" />
              <span className="hidden sm:inline">Read Aloud</span>
            </button>

            <button
              onClick={() => toggleDrawer('tasks')}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Tabs & Search */}
        <div className="p-4 border-b border-white/[0.06] space-y-3">
          <div className="flex space-x-1 bg-white/5 p-1 rounded-xl">
            {(['all', 'today', 'pending', 'completed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  filter === f
                    ? 'bg-cyan-500 text-black font-semibold shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/[0.06] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isAdding && (
            <form
              onSubmit={handleCreate}
              className="p-4 rounded-2xl bg-white/5 border border-cyan-500/30 space-y-3 mb-4"
            >
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                Create New Task
              </h3>
              <input
                type="text"
                placeholder="Task title (e.g. Practice Java DSA)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
                className="w-full bg-[#0a0e17] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
              <textarea
                placeholder="Description or notes (optional)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={2}
                className="w-full bg-[#0a0e17] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full bg-[#0a0e17] border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Due Time</label>
                  <input
                    type="time"
                    value={newDueTime}
                    onChange={(e) => setNewDueTime(e.target.value)}
                    className="w-full bg-[#0a0e17] border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center space-x-1.5">
                  {(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewPriority(p)}
                      className={`text-[10px] px-2 py-1 rounded-lg border capitalize ${
                        newPriority === p
                          ? 'bg-cyan-500 text-black font-bold border-cyan-400'
                          : 'bg-white/5 text-slate-400 border-white/10'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <label className="flex items-center space-x-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasReminder}
                    onChange={(e) => setHasReminder(e.target.checked)}
                    className="rounded text-cyan-500"
                  />
                  <span>Reminder</span>
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold shadow-md shadow-cyan-500/20"
                >
                  Save Task
                </button>
              </div>
            </form>
          )}

          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40 text-cyan-400" />
              <p>No tasks matching this filter.</p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  task.status === 'completed'
                    ? 'bg-white/[0.02] border-white/[0.04] opacity-60'
                    : 'bg-white/[0.04] hover:bg-white/[0.06] border-white/[0.08]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="mt-0.5 text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      {task.status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5 fill-emerald-500/20 text-emerald-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-400" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <h4
                        className={`text-sm font-medium leading-snug ${
                          task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-100'
                        }`}
                      >
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center space-x-2 mt-2 flex-wrap gap-y-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold uppercase ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>

                        <span className="text-[11px] text-slate-400 flex items-center space-x-1 font-mono">
                          <Calendar className="w-3 h-3" />
                          <span>{task.dueDate}</span>
                        </span>

                        {task.dueTime && (
                          <span className="text-[11px] text-cyan-300 flex items-center space-x-1 font-mono">
                            <Clock className="w-3 h-3" />
                            <span>{task.dueTime}</span>
                          </span>
                        )}

                        {task.hasReminder && (
                          <span className="text-[10px] text-purple-300 flex items-center space-x-1">
                            <Bell className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => deleteTask(task.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all ml-2"
                    title="Delete Task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom Action Footer */}
        <div className="p-4 border-t border-white/[0.08]">
          <button
            onClick={() => setIsAdding(true)}
            className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Task</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
