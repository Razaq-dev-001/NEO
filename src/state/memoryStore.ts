import { create } from 'zustand';
import { MemoryCategory, MemoryItem } from '../types/memory';

interface MemoryState {
  memories: MemoryItem[];
  searchQuery: string;
  selectedCategory: string;
  isDrawerOpen: boolean;

  addMemory: (memory: Omit<MemoryItem, 'id' | 'createdAt' | 'updatedAt'>) => MemoryItem;
  updateMemory: (id: string, updates: Partial<MemoryItem>) => void;
  deleteMemory: (id: string) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (cat: string) => void;
  setDrawerOpen: (open: boolean) => void;
  setMemories: (memories: MemoryItem[]) => void;
  getFormattedMemoryContext: () => string;
}

export const useMemoryStore = create<MemoryState>((set, get) => ({
  memories: [
    {
      id: 'mem-user-name',
      category: 'identity',
      key: 'user_name',
      value: 'Razaq',
      confidence: 1.0,
      createdAt: Date.now() - 86400000 * 5,
      updatedAt: Date.now() - 86400000 * 5,
    },
    {
      id: 'mem-user-role',
      category: 'identity',
      key: 'role',
      value: 'Senior Developer & AI Engineer',
      confidence: 0.95,
      createdAt: Date.now() - 86400000 * 4,
      updatedAt: Date.now() - 86400000 * 4,
    },
    {
      id: 'mem-fav-lang',
      category: 'preference',
      key: 'favorite_languages',
      value: 'TypeScript, Python, and Java',
      confidence: 0.9,
      createdAt: Date.now() - 86400000 * 3,
      updatedAt: Date.now() - 86400000 * 3,
    },
    {
      id: 'mem-project-neo',
      category: 'project',
      key: 'active_project',
      value: 'Building NEO 3D AI companion with R3F and Electron',
      confidence: 1.0,
      createdAt: Date.now() - 86400000 * 2,
      updatedAt: Date.now() - 86400000 * 2,
    },
  ],
  searchQuery: '',
  selectedCategory: 'all',
  isDrawerOpen: false,

  addMemory: (data) => {
    // Check if key already exists, update if so
    const existing = get().memories.find(
      (m) => m.key.toLowerCase() === data.key.toLowerCase()
    );

    if (existing) {
      get().updateMemory(existing.id, {
        value: data.value,
        confidence: data.confidence,
        category: data.category,
      });
      return { ...existing, ...data, updatedAt: Date.now() };
    }

    const newMemory: MemoryItem = {
      ...data,
      id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    set((state) => {
      const updated = [newMemory, ...state.memories];
      try {
        localStorage.setItem('neo_memories_backup', JSON.stringify(updated));
      } catch (e) {}
      return { memories: updated };
    });

    return newMemory;
  },

  updateMemory: (id, updates) => {
    set((state) => {
      const updated = state.memories.map((m) =>
        m.id === id ? { ...m, ...updates, updatedAt: Date.now() } : m
      );
      try {
        localStorage.setItem('neo_memories_backup', JSON.stringify(updated));
      } catch (e) {}
      return { memories: updated };
    });
  },

  deleteMemory: (id) => {
    set((state) => {
      const updated = state.memories.filter((m) => m.id !== id);
      try {
        localStorage.setItem('neo_memories_backup', JSON.stringify(updated));
      } catch (e) {}
      return { memories: updated };
    });
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setDrawerOpen: (isDrawerOpen) => set({ isDrawerOpen }),
  setMemories: (memories) => set({ memories }),

  getFormattedMemoryContext: () => {
    const mems = get().memories;
    if (mems.length === 0) return 'No stored memories yet.';
    return mems
      .map((m) => `• [${m.category.toUpperCase()}] ${m.key}: ${m.value}`)
      .join('\n');
  },
}));
