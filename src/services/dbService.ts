import { TaskItem } from '../types/task';
import { MemoryItem } from '../types/memory';

class DatabaseService {
  private db: any = null;
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Dynamic import to prevent bundler execution halts
      const initSqlJsModule = await import('sql.js');
      const initSqlJs = initSqlJsModule.default || initSqlJsModule;

      const SQL = await initSqlJs({
        locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
      });

      const savedDb = localStorage.getItem('neo_sqlite_binary');
      if (savedDb) {
        const u8 = new Uint8Array(JSON.parse(savedDb));
        this.db = new SQL.Database(u8);
      } else {
        this.db = new SQL.Database();
      }

      this.createTables();
      this.isInitialized = true;
      console.log('NEO SQLite Database initialized successfully.');
    } catch (err) {
      console.warn('SQLite wasm not reachable, running in resilient localStorage mode:', err);
      this.isInitialized = true;
    }
  }

  private createTables() {
    if (!this.db) return;

    try {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          due_date TEXT NOT NULL,
          due_time TEXT,
          priority TEXT NOT NULL,
          status TEXT NOT NULL,
          has_reminder INTEGER DEFAULT 0,
          reminder_time TEXT,
          created_at INTEGER NOT NULL,
          completed_at INTEGER
        );
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS memories (
          id TEXT PRIMARY KEY,
          category TEXT NOT NULL,
          key_name TEXT NOT NULL UNIQUE,
          value_text TEXT NOT NULL,
          confidence REAL DEFAULT 1.0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `);

      this.persist();
    } catch (e) {
      console.warn('Failed to create SQLite tables:', e);
    }
  }

  private persist() {
    if (!this.db) return;
    try {
      const data = this.db.export();
      const array = Array.from(data);
      localStorage.setItem('neo_sqlite_binary', JSON.stringify(array));
    } catch (e) {
      console.warn('Failed to persist SQLite binary:', e);
    }
  }

  // --- Task Methods ---
  saveTask(task: TaskItem) {
    if (this.db) {
      try {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO tasks (id, title, description, due_date, due_time, priority, status, has_reminder, reminder_time, created_at, completed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run([
          task.id,
          task.title,
          task.description,
          task.dueDate,
          task.dueTime || null,
          task.priority,
          task.status,
          task.hasReminder ? 1 : 0,
          task.reminderTime || null,
          task.createdAt,
          task.completedAt || null,
        ]);
        stmt.free();
        this.persist();
      } catch (e) {}
    }

    // Always mirror to localStorage for instant recovery
    try {
      const stored = this.getAllTasks();
      const exists = stored.findIndex((t) => t.id === task.id);
      if (exists >= 0) stored[exists] = task;
      else stored.unshift(task);
      localStorage.setItem('neo_tasks_backup', JSON.stringify(stored));
    } catch (e) {}
  }

  deleteTask(id: string) {
    if (this.db) {
      try {
        this.db.run('DELETE FROM tasks WHERE id = ?', [id]);
        this.persist();
      } catch (e) {}
    }
    try {
      const stored = this.getAllTasks().filter((t) => t.id !== id);
      localStorage.setItem('neo_tasks_backup', JSON.stringify(stored));
    } catch (e) {}
  }

  getAllTasks(): TaskItem[] {
    if (this.db) {
      try {
        const res = this.db.exec('SELECT * FROM tasks ORDER BY created_at DESC');
        if (res.length > 0) {
          const columns = res[0].columns;
          return res[0].values.map((row: any[]) => {
            const item: any = {};
            columns.forEach((col: string, i: number) => {
              item[col] = row[i];
            });
            return {
              id: item.id,
              title: item.title,
              description: item.description || '',
              dueDate: item.due_date,
              dueTime: item.due_time || undefined,
              priority: item.priority as any,
              status: item.status as any,
              hasReminder: Boolean(item.has_reminder),
              reminderTime: item.reminder_time || undefined,
              createdAt: Number(item.created_at),
              completedAt: item.completed_at ? Number(item.completed_at) : undefined,
            };
          });
        }
      } catch (e) {}
    }

    // Fallback to localStorage
    try {
      const saved = localStorage.getItem('neo_tasks_backup');
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    return [];
  }

  // --- Memory Methods ---
  saveMemory(memory: MemoryItem) {
    if (this.db) {
      try {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO memories (id, category, key_name, value_text, confidence, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run([
          memory.id,
          memory.category,
          memory.key,
          memory.value,
          memory.confidence,
          memory.createdAt,
          memory.updatedAt,
        ]);
        stmt.free();
        this.persist();
      } catch (e) {}
    }
    try {
      const stored = this.getAllMemories();
      const exists = stored.findIndex((m) => m.id === memory.id || m.key === memory.key);
      if (exists >= 0) stored[exists] = memory;
      else stored.unshift(memory);
      localStorage.setItem('neo_memories_backup', JSON.stringify(stored));
    } catch (e) {}
  }

  deleteMemory(id: string) {
    if (this.db) {
      try {
        this.db.run('DELETE FROM memories WHERE id = ?', [id]);
        this.persist();
      } catch (e) {}
    }
    try {
      const stored = this.getAllMemories().filter((m) => m.id !== id);
      localStorage.setItem('neo_memories_backup', JSON.stringify(stored));
    } catch (e) {}
  }

  getAllMemories(): MemoryItem[] {
    if (this.db) {
      try {
        const res = this.db.exec('SELECT * FROM memories ORDER BY updated_at DESC');
        if (res.length > 0) {
          const columns = res[0].columns;
          return res[0].values.map((row: any[]) => {
            const item: any = {};
            columns.forEach((col: string, i: number) => {
              item[col] = row[i];
            });
            return {
              id: item.id,
              category: item.category as any,
              key: item.key_name,
              value: item.value_text,
              confidence: Number(item.confidence),
              createdAt: Number(item.created_at),
              updatedAt: Number(item.updated_at),
            };
          });
        }
      } catch (e) {}
    }

    try {
      const saved = localStorage.getItem('neo_memories_backup');
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    return [];
  }
}

export const dbService = new DatabaseService();
