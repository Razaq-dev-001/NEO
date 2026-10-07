import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Brain,
  Trash2,
  Search,
  Tag,
  Volume2,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { useMemoryStore } from '../../state/memoryStore';
import { useSettingsStore } from '../../state/settingsStore';
import { speechService } from '../../services/speechService';
import { soundFx } from '../../services/audioSynthesizer';
import { MemoryCategory } from '../../types/memory';

export const MemoryDrawer: React.FC = () => {
  const activeDrawer = useSettingsStore((s) => s.activeDrawer);
  const toggleDrawer = useSettingsStore((s) => s.toggleDrawer);

  const memories = useMemoryStore((s) => s.memories);
  const addMemory = useMemoryStore((s) => s.addMemory);
  const deleteMemory = useMemoryStore((s) => s.deleteMemory);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isAdding, setIsAdding] = useState(false);

  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryCategory>('general');

  if (activeDrawer !== 'memories') return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) return;

    soundFx.playSuccessPing();
    addMemory({
      category: newCategory,
      key: newKey.trim().toLowerCase().replace(/\s+/g, '_'),
      value: newValue.trim(),
      confidence: 1.0,
    });

    setNewKey('');
    setNewValue('');
    setIsAdding(false);
  };

  const handleReadMemories = () => {
    soundFx.playWakeChime();
    if (memories.length === 0) {
      speechService.speak('I do not have any saved memories stored in my vault yet.');
      return;
    }
    const memList = memories
      .slice(0, 4)
      .map((m) => `${m.key.replace(/_/g, ' ')} is ${m.value}`)
      .join('. ');
    speechService.speak(`Here is what I remember about you: ${memList}`);
  };

  const filteredMemories = memories.filter((m) => {
    if (selectedCategory !== 'all' && m.category !== selectedCategory) return false;
    const matchQuery =
      m.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.value.toLowerCase().includes(searchQuery.toLowerCase());
    return matchQuery;
  });

  const getCategoryBadgeColor = (cat: string) => {
    switch (cat) {
      case 'identity':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'preference':
        return 'text-pink-400 bg-pink-500/10 border-pink-500/20';
      case 'project':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      case 'routine':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const categories: Array<{ id: string; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'identity', label: 'Identity' },
    { id: 'preference', label: 'Preferences' },
    { id: 'project', label: 'Projects' },
    { id: 'routine', label: 'Routines' },
    { id: 'general', label: 'Notes' },
  ];

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
              <Brain className="w-5 h-5 text-purple-400" />
              <span>Personal Memory Vault</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              {memories.length} facts remembered across sessions
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleReadMemories}
              className="p-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 transition-all text-xs flex items-center space-x-1"
              title="Read Memories Aloud"
            >
              <Volume2 className="w-4 h-4" />
              <span className="hidden sm:inline">Recite</span>
            </button>

            <button
              onClick={() => toggleDrawer('memories')}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Categories & Search */}
        <div className="p-4 border-b border-white/[0.06] space-y-3">
          {/* Category Pills */}
          <div className="flex space-x-1.5 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`flex-shrink-0 px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                  selectedCategory === c.id
                    ? 'bg-purple-500 text-white font-semibold shadow-md shadow-purple-500/20'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search memories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/[0.06] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
            />
          </div>
        </div>

        {/* Memory List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isAdding && (
            <form
              onSubmit={handleCreate}
              className="p-4 rounded-2xl bg-white/5 border border-purple-500/30 space-y-3 mb-4"
            >
              <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                Store New Memory
              </h3>
              <input
                type="text"
                placeholder="Topic / Key (e.g. coffee_preference, birthday)"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                autoFocus
                className="w-full bg-[#0a0e17] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
              />
              <textarea
                placeholder="Information to remember (e.g. Likes black coffee with no sugar)"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                rows={2}
                className="w-full bg-[#0a0e17] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              />

              <div className="flex items-center space-x-1.5">
                {(['identity', 'preference', 'project', 'routine', 'general'] as MemoryCategory[]).map(
                  (cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewCategory(cat)}
                      className={`text-[10px] px-2 py-1 rounded-lg border capitalize ${
                        newCategory === cat
                          ? 'bg-purple-500 text-white font-bold border-purple-400'
                          : 'bg-white/5 text-slate-400 border-white/10'
                      }`}
                    >
                      {cat}
                    </button>
                  )
                )}
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
                  className="px-4 py-1.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white text-xs font-bold shadow-md shadow-purple-500/20"
                >
                  Save Fact
                </button>
              </div>
            </form>
          )}

          {filteredMemories.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              <Brain className="w-8 h-8 mx-auto mb-2 opacity-40 text-purple-400" />
              <p>No memories found.</p>
            </div>
          ) : (
            filteredMemories.map((mem) => (
              <div
                key={mem.id}
                className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08] transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center space-x-2 mb-1.5">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md border font-mono font-semibold uppercase ${getCategoryBadgeColor(
                          mem.category
                        )}`}
                      >
                        {mem.category}
                      </span>
                      <span className="text-xs font-mono font-bold text-purple-300 truncate">
                        {mem.key.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <p className="text-sm text-slate-200 leading-snug">{mem.value}</p>

                    <div className="flex items-center space-x-2 mt-2 text-[10px] text-slate-400 font-mono">
                      <span className="flex items-center space-x-1 text-emerald-400">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Confidence: {Math.round(mem.confidence * 100)}%</span>
                      </span>
                      <span>•</span>
                      <span>{new Date(mem.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => deleteMemory(mem.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all"
                    title="Delete Memory"
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
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-purple-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Store New Memory</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
