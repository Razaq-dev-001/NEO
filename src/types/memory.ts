export type MemoryCategory =
  | 'identity'
  | 'preference'
  | 'routine'
  | 'project'
  | 'contact'
  | 'general';

export interface MemoryItem {
  id: string;
  category: MemoryCategory;
  key: string;
  value: string;
  confidence: number;
  createdAt: number;
  updatedAt: number;
}
