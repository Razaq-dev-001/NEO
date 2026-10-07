import { AnimationState, EmotionState, RobotAction } from './robot';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  emotion?: EmotionState;
  action?: RobotAction;
  metadata?: {
    type?: 'news' | 'weather' | 'task' | 'memory' | 'action' | 'general';
    data?: any;
  };
}

export interface IntentResult {
  intent: 'chat' | 'action' | 'task' | 'memory' | 'news' | 'weather' | 'time' | 'date' | 'clear' | 'unknown';
  action?: RobotAction;
  emotion?: EmotionState;
  taskPayload?: {
    action: 'add' | 'list' | 'complete' | 'delete' | 'search';
    title?: string;
    description?: string;
    dueDate?: string;
    dueTime?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    taskId?: string;
  };
  memoryPayload?: {
    action: 'add' | 'list' | 'delete' | 'recall';
    category?: 'identity' | 'preference' | 'routine' | 'project' | 'general';
    key?: string;
    value?: string;
    memoryId?: string;
  };
  newsCategory?: 'all' | 'tech' | 'ai' | 'world' | 'india' | 'business';
  weatherLocation?: string;
  confidence: number;
  replyText?: string;
}

export interface ToolCallDeclaration {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}
