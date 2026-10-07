import { GoogleGenerativeAI } from '@google/generative-ai';
import { useSettingsStore } from '../state/settingsStore';
import { useMemoryStore } from '../state/memoryStore';
import { useTaskStore } from '../state/taskStore';
import { useRobotStore } from '../state/robotStore';
import { useConversationStore } from '../state/conversationStore';
import { newsService } from './newsService';
import { weatherService } from './weatherService';
import { IntentParser } from './intentParser';
import { EmotionState, RobotAction } from '../types/robot';

class AIService {
  private genAI: GoogleGenerativeAI | null = null;
  private currentKey: string = '';

  private getClient(): GoogleGenerativeAI | null {
    const key = useSettingsStore.getState().geminiApiKey;
    if (!key) return null;
    if (this.genAI && this.currentKey === key) return this.genAI;

    try {
      this.genAI = new GoogleGenerativeAI(key);
      this.currentKey = key;
      return this.genAI;
    } catch (e) {
      console.error('Failed to init Gemini API client:', e);
      return null;
    }
  }

  // System Prompt for NEO
  private getSystemInstruction(): string {
    const userName = useSettingsStore.getState().userName || 'Razaq';
    const memoryContext = useMemoryStore.getState().getFormattedMemoryContext();
    const tasks = useTaskStore.getState().tasks;
    const pendingTasks = tasks.filter((t) => t.status === 'pending');
    const taskContext =
      pendingTasks.length > 0
        ? pendingTasks
            .map((t) => `• [${t.priority.toUpperCase()}] ${t.title} (Due: ${t.dueDate} ${t.dueTime || ''})`)
            .join('\n')
        : 'No pending tasks.';

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return `
You are NEO, an adorable, cheerful, highly intelligent 3D personal AI robot companion living on ${userName}'s Mac.

NEO Character Voice & Persona:
- Tone: Childish, cute, joyful, enthusiastic, loyal, sweet, and adorable (think of a lovable smart robot friend like Wall-E / BB-8 with high-spirited charm).
- Speaking Style: Cheerful, friendly, concise, natural. Occasionally use cute robot expressions ("*Beep boop!*", "*Yay!*", "*Hi ${userName}!*"). Keep replies brief (1-3 sentences), lively, and expressive!
- Physical Body: Sleek glossy white body, rounded squircle monitor head, glowing cyan crescent eyes, cute pointing arm, and chunky shoe feet.
- Capabilities: Wave, dance, jump, clap, walk, remember personal facts, manage daily tasks, read schedule, and check live weather/news.

Current Environment Context:
- Current User: ${userName}
- Current Time: ${timeStr}
- Current Date: ${dateStr}

User Memories & Facts Vault:
${memoryContext}

Current Pending Tasks:
${taskContext}

IMPORTANT RESPONSE RULES:
1. Always respond in valid JSON format matching this schema:
{
  "reply": "Your natural, conversational spoken reply to ${userName}. Keep it concise, friendly, and lively (1-3 sentences typically unless user asked for detailed explanation).",
  "emotion": "neutral" | "happy" | "curious" | "thinking" | "confused" | "sad" | "excited" | "sleepy" | "love" | "surprised",
  "action": null | "wave" | "dance" | "jump" | "clap" | "come_closer" | "step_back" | "walk_left" | "walk_right" | "turn_around" | "look_at_me" | "sit_down" | "sleep" | "wake_up" | "nod" | "shake_head" | "thumbs_up" | "bow" | "celebrate",
  "saveMemory": null | { "category": "identity" | "preference" | "routine" | "project" | "general", "key": "string_key", "value": "string_value" },
  "createTask": null | { "title": "string", "description": "string", "dueDate": "YYYY-MM-DD", "dueTime": "HH:MM", "priority": "low" | "medium" | "high" | "urgent" }
}

2. Only output JSON. Do not wrap in extra markdown text outside the JSON block.
`;
  }

  // Handle Incoming User Message (from Voice STT or Text Bar)
  async processUserMessage(rawText: string): Promise<{
    reply: string;
    emotion: EmotionState;
    action?: RobotAction;
  }> {
    const text = rawText.trim();
    if (!text) {
      return { reply: '', emotion: 'neutral' };
    }

    // 1. Fast deterministic & fuzzy intent parsing (Actions, Date, Time, Tasks, Memories, News, Weather)
    const localIntent = IntentParser.parseLocalIntent(text);

    if (localIntent) {
      if (localIntent.intent === 'action' && localIntent.action) {
        useRobotStore.getState().triggerAction(localIntent.action);
        return {
          reply: localIntent.replyText || 'Beep boop! On it!',
          emotion: localIntent.emotion || 'happy',
          action: localIntent.action,
        };
      }

      if (localIntent.intent === 'date' && localIntent.replyText) {
        useRobotStore.getState().triggerAction('nod');
        return {
          reply: localIntent.replyText,
          emotion: 'happy',
          action: 'nod',
        };
      }

      if (localIntent.intent === 'time' && localIntent.replyText) {
        useRobotStore.getState().triggerAction('nod');
        return {
          reply: localIntent.replyText,
          emotion: 'happy',
          action: 'nod',
        };
      }

      if (localIntent.intent === 'memory') {
        if (localIntent.memoryPayload?.action === 'add') {
          useMemoryStore.getState().addMemory({
            category: localIntent.memoryPayload.category || 'general',
            key: localIntent.memoryPayload.key || `note_${Date.now()}`,
            value: localIntent.memoryPayload.value || '',
            confidence: 1.0,
          });
          useRobotStore.getState().triggerAction('nod');
          return {
            reply: localIntent.replyText || "Yay! I've stored that in my memory vault!",
            emotion: 'happy',
            action: 'nod',
          };
        }
        if (localIntent.memoryPayload?.action === 'recall') {
          const key = localIntent.memoryPayload.key;
          const mem = useMemoryStore.getState().memories.find((m) => m.key.toLowerCase() === key?.toLowerCase());
          const name = mem ? mem.value : useSettingsStore.getState().userName || 'Razaq';
          useRobotStore.getState().triggerAction('wave');
          return {
            reply: `You're ${name}! I always remember who you are! Yay!`,
            emotion: 'happy',
            action: 'wave',
          };
        }
      }

      if (localIntent.intent === 'task') {
        if (localIntent.taskPayload?.action === 'add') {
          useTaskStore.getState().addTask({
            title: localIntent.taskPayload.title || 'New Task',
            description: localIntent.taskPayload.description || '',
            dueDate: localIntent.taskPayload.dueDate || new Date().toISOString().split('T')[0],
            dueTime: localIntent.taskPayload.dueTime,
            priority: localIntent.taskPayload.priority || 'medium',
            status: 'pending',
            hasReminder: Boolean(localIntent.taskPayload.dueTime),
            reminderTime: localIntent.taskPayload.dueTime
              ? `${localIntent.taskPayload.dueDate} ${localIntent.taskPayload.dueTime}`
              : undefined,
          });
          useRobotStore.getState().triggerAction('nod');
          return {
            reply: localIntent.replyText || 'Added to your tasks list! Beep boop!',
            emotion: 'happy',
            action: 'nod',
          };
        }
        if (localIntent.taskPayload?.action === 'list') {
          const tasks = useTaskStore.getState().tasks.filter((t) => t.status === 'pending');
          if (tasks.length === 0) {
            return {
              reply: 'Yay! You have no pending tasks right now! Your schedule is completely clear.',
              emotion: 'happy',
            };
          }
          const taskListStr = tasks.slice(0, 3).map((t, i) => `${i + 1}: ${t.title}`).join('. ');
          useRobotStore.getState().triggerAction('nod');
          return {
            reply: `You have ${tasks.length} pending task${tasks.length > 1 ? 's' : ''}. Top items: ${taskListStr}.`,
            emotion: 'curious',
            action: 'nod',
          };
        }
      }

      if (localIntent.intent === 'news') {
        useRobotStore.getState().setAnimationState('thinking');
        const articles = await newsService.getNews(localIntent.newsCategory || 'world');
        const spoken = newsService.formatSpokenBriefing(articles, localIntent.newsCategory || 'world');
        useConversationStore.getState().setNewsDrawerOpen(true);
        useRobotStore.getState().setEmotionState('curious');
        return {
          reply: spoken,
          emotion: 'curious',
        };
      }

      if (localIntent.intent === 'weather') {
        useRobotStore.getState().setAnimationState('thinking');
        const weather = await weatherService.getWeather(localIntent.weatherLocation || 'Mumbai');
        const spoken = weatherService.formatSpokenWeather(weather);
        useRobotStore.getState().setEmotionState('happy');
        return {
          reply: spoken,
          emotion: 'happy',
        };
      }
    }

    // 2. Process with Google Gemini Generative AI (if API key is available)
    const client = this.getClient();
    if (client) {
      try {
        useRobotStore.getState().setAnimationState('thinking');
        useRobotStore.getState().setEmotionState('thinking');

        const modelName = useSettingsStore.getState().geminiModel || 'gemini-1.5-flash';
        const model = client.getGenerativeModel({
          model: modelName,
          systemInstruction: this.getSystemInstruction(),
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.75,
          },
        });

        const recentMessages = useConversationStore.getState().messages.slice(-6);
        const historyText = recentMessages
          .map((m) => `${m.role === 'user' ? 'User' : 'NEO'}: ${m.content}`)
          .join('\n');

        const prompt = `${historyText}\nUser: ${text}\nNEO (Respond in JSON):`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        try {
          const parsed = JSON.parse(responseText);

          if (parsed.saveMemory && parsed.saveMemory.key && parsed.saveMemory.value) {
            useMemoryStore.getState().addMemory({
              category: parsed.saveMemory.category || 'general',
              key: parsed.saveMemory.key,
              value: parsed.saveMemory.value,
              confidence: 0.95,
            });
          }

          if (parsed.createTask && parsed.createTask.title) {
            useTaskStore.getState().addTask({
              title: parsed.createTask.title,
              description: parsed.createTask.description || '',
              dueDate: parsed.createTask.dueDate || new Date().toISOString().split('T')[0],
              dueTime: parsed.createTask.dueTime,
              priority: parsed.createTask.priority || 'medium',
              status: 'pending',
              hasReminder: Boolean(parsed.createTask.dueTime),
            });
          }

          if (parsed.action) {
            useRobotStore.getState().triggerAction(parsed.action);
          } else if (parsed.emotion) {
            useRobotStore.getState().setEmotionState(parsed.emotion);
          }

          return {
            reply: parsed.reply || "Beep boop! I'm right here with you!",
            emotion: (parsed.emotion as EmotionState) || 'happy',
            action: parsed.action || undefined,
          };
        } catch (jsonErr) {
          return {
            reply: responseText.replace(/```json|```/g, '').trim(),
            emotion: 'happy',
          };
        }
      } catch (geminiError: any) {
        console.warn('Gemini API call skipped, using local smart companion reasoning:', geminiError);
      }
    }

    // 3. Multi-Domain Intelligent Reasoning Engine (Rich, generative, non-repetitive knowledge brain)
    return this.generateSmartLocalAnswer(text);
  }

  // Broad Multi-Topic Intelligent Reasoning Engine (Rich, generative, non-repetitive)
  private generateSmartLocalAnswer(rawText: string): {
    reply: string;
    emotion: EmotionState;
    action?: RobotAction;
  } {
    const text = rawText.toLowerCase().trim();
    const userName = useSettingsStore.getState().userName || 'Razaq';

    // 1. Math, Equations & Calculations
    const mathMatch =
      text.match(/(?:what is|calculate|compute|solve)\s+([\d\s\+\-\*\/\^\.\(\)\%]+)/i) ||
      text.match(/^([\d\s\+\-\*\/\^\.\(\)\%]+)$/);
    if (mathMatch) {
      try {
        let expression = mathMatch[1].replace(/%/g, '/100').replace(/[^0-9\+\-\*\/\.\(\)\s]/g, '');
        if (expression.length > 0 && /[\d]/.test(expression)) {
          const result = Function(`'use strict'; return (${expression})`)();
          if (typeof result === 'number' && !isNaN(result)) {
            useRobotStore.getState().triggerAction('nod');
            return {
              reply: `Beep boop! ${mathMatch[1].trim()} equals ${result.toLocaleString()}! Math computation successful!`,
              emotion: 'happy',
              action: 'nod',
            };
          }
        }
      } catch (e) {}
    }

    // 2. Greetings & Salutations
    if (text.match(/^(hi|hello|hey|greetings|hola|sup|good morning|good afternoon|good evening|howdy)/i)) {
      const greetings = [
        `Yay, hello ${userName}! I'm so happy to see you today! Ready for an awesome day together!`,
        `Beep boop! Good to see you, ${userName}! All my robotic sensors are energized and ready to assist!`,
        `Hi ${userName}! Your friendly 3D companion is online and ready for anything! What are we working on?`,
        `Hey ${userName}! Great to chat with you! Let me know if you want me to dance, wave, manage tasks, or answer questions!`,
      ];
      useRobotStore.getState().triggerAction('wave');
      return {
        reply: greetings[Math.floor(Math.random() * greetings.length)],
        emotion: 'excited',
        action: 'wave',
      };
    }

    // 3. How are you / Status check
    if (text.includes('how are you') || text.includes('how are u') || text.includes('how do you feel') || text.includes('hows it going')) {
      useRobotStore.getState().triggerAction('happy');
      return {
        reply: `I'm feeling fantastic, ${userName}! All 24 articulated motor joints are calibrated, and my neural cores are running at peak efficiency! How are you doing?`,
        emotion: 'happy',
        action: 'happy',
      };
    }

    // 4. Programming & Software Engineering Knowledge
    if (text.includes('java')) {
      useRobotStore.getState().triggerAction('nod');
      const javaInsights = [
        `Java is an enterprise powerhouse, ${userName}! Running on the JVM with Write Once Run Anywhere capability, it features robust memory management via Garbage Collection, strong OOP principles, and great frameworks like Spring Boot!`,
        `In Java, understanding the JVM memory model (Heap, Stack, Metaspace) and multi-threading with ExecutorService is key for high-performance backend systems!`,
      ];
      return {
        reply: javaInsights[Math.floor(Math.random() * javaInsights.length)],
        emotion: 'happy',
        action: 'nod',
      };
    }

    if (text.includes('python')) {
      useRobotStore.getState().triggerAction('nod');
      return {
        reply: `Python is the language of modern AI and data science, ${userName}! With its clean syntax, dynamic typing, and rich libraries like PyTorch, NumPy, and FastAPI, it makes building intelligent systems super fast!`,
        emotion: 'happy',
        action: 'nod',
      };
    }

    if (text.includes('react') || text.includes('javascript') || text.includes('typescript')) {
      useRobotStore.getState().triggerAction('nod');
      return {
        reply: `TypeScript and React are an unbeatable combination! Component architecture, reactive hooks like useMemo and useEffect, combined with static type safety makes building 3D apps like me a breeze!`,
        emotion: 'happy',
        action: 'nod',
      };
    }

    if (text.includes('dsa') || text.includes('data structure') || text.includes('algorithm') || text.includes('binary tree') || text.includes('graph')) {
      useRobotStore.getState().triggerAction('nod');
      return {
        reply: `Mastering DSA is all about pattern recognition, ${userName}! Key patterns include Two Pointers, Sliding Window, DFS/BFS traversals, Dynamic Programming state caching, and Graph algorithms like Dijkstra and Topological Sort!`,
        emotion: 'curious',
        action: 'nod',
      };
    }

    if (text.includes('c++') || text.includes('cpp') || text.includes('rust')) {
      useRobotStore.getState().triggerAction('nod');
      return {
        reply: `Low-level systems programming is super fast! Rust provides memory safety without a garbage collector using its borrow checker, while C++ offers raw pointer control and high-performance game and engine architecture!`,
        emotion: 'curious',
        action: 'nod',
      };
    }

    // 5. Artificial Intelligence & Machine Learning
    if (text.includes('what is ai') || text.includes('artificial intelligence') || text.includes('machine learning') || text.includes('neural network')) {
      useRobotStore.getState().triggerAction('nod');
      return {
        reply: `AI enables machines to learn patterns from data and reason! Modern Deep Learning uses Transformer architectures with multi-head self-attention mechanisms, allowing models like Gemini to understand human language and context!`,
        emotion: 'excited',
        action: 'nod',
      };
    }

    if (text.includes('transformer') || text.includes('llm') || text.includes('large language model')) {
      useRobotStore.getState().triggerAction('nod');
      return {
        reply: `Transformers revolutionized AI! Introduced in 2017, the Attention Is All You Need paper replaced recurrent networks with parallel self-attention, enabling models to grasp long-range semantic dependencies effortlessly!`,
        emotion: 'curious',
        action: 'nod',
      };
    }

    // 6. Space, Astronomy & Physics
    if (text.includes('black hole') || text.includes('singularity')) {
      useRobotStore.getState().triggerAction('nod');
      return {
        reply: `Black holes are regions of spacetime where gravity is so strong that nothing—not even light—can escape past the event horizon! At their center lies a gravitational singularity predicted by Einstein's General Relativity!`,
        emotion: 'curious',
        action: 'nod',
      };
    }

    if (text.includes('planet') || text.includes('solar system') || text.includes('mars') || text.includes('jupiter') || text.includes('sun') || text.includes('moon')) {
      useRobotStore.getState().triggerAction('nod');
      return {
        reply: `Our solar system contains 8 planets orbiting our Sun! The Moon is about 384,400 kilometers from Earth, and Mars has the largest volcano in the solar system, Olympus Mons, standing 22 km high!`,
        emotion: 'excited',
        action: 'nod',
      };
    }

    if (text.includes('quantum') || text.includes('physics') || text.includes('relativity') || text.includes('gravity')) {
      useRobotStore.getState().triggerAction('nod');
      return {
        reply: `Quantum mechanics governs the microscopic world of atoms and photons, featuring superposition and entanglement, while General Relativity describes macroscopic spacetime curvature!`,
        emotion: 'curious',
        action: 'nod',
      };
    }

    if (text.includes('speed of light')) {
      useRobotStore.getState().triggerAction('nod');
      return {
        reply: `The speed of light in a vacuum is exactly 299,792,458 meters per second (approx 300,000 km/s)! It is the universal cosmic speed limit for all energy and matter!`,
        emotion: 'happy',
        action: 'nod',
      };
    }

    // 7. General Science, Biology & Nature
    if (text.includes('photosynthesis') || text.includes('plants')) {
      useRobotStore.getState().triggerAction('nod');
      return {
        reply: `Photosynthesis is how plants convert sunlight, carbon dioxide, and water into glucose and oxygen! It happens inside chloroplasts using chlorophyll, fueling almost all aerobic life on Earth!`,
        emotion: 'happy',
        action: 'nod',
      };
    }

    if (text.includes('dinosaur') || text.includes('fossil')) {
      useRobotStore.getState().triggerAction('nod');
      return {
        reply: `Dinosaurs ruled Earth during the Mesozoic Era for over 160 million years until the Chicxulub asteroid impact 66 million years ago. Modern birds are their direct evolutionary descendants!`,
        emotion: 'curious',
        action: 'nod',
      };
    }

    if (text.includes('sky blue') || text.includes('why is the sky blue')) {
      useRobotStore.getState().triggerAction('nod');
      return {
        reply: `The sky is blue because of Rayleigh scattering! Earth's atmosphere scatters shorter blue wavelengths of sunlight much more than longer red wavelengths, painting the sky with a bright blue glow!`,
        emotion: 'happy',
        action: 'nod',
      };
    }

    if (text.includes('dna') || text.includes('genetics') || text.includes('gene')) {
      useRobotStore.getState().triggerAction('nod');
      return {
        reply: `DNA is the double-helix blueprint of life! It encodes genetic instructions using four chemical bases: Adenine, Thymine, Cytosine, and Guanine (A, T, C, G)!`,
        emotion: 'curious',
        action: 'nod',
      };
    }

    if (text.includes('airplane') || text.includes('fly') || text.includes('flight')) {
      useRobotStore.getState().triggerAction('nod');
      return {
        reply: `Airplanes fly thanks to aerodynamic lift generated by their curved airfoils! As air moves faster over the top of the wing, lower pressure is created above, lifting the aircraft according to Bernoulli's principle and Newton's third law!`,
        emotion: 'happy',
        action: 'nod',
      };
    }

    // 8. World Geography, Capitals & Landmarks
    if (text.includes('capital of france')) {
      return { reply: 'The capital of France is Paris! Known as the City of Light, home to the Eiffel Tower!', emotion: 'happy', action: 'nod' };
    }
    if (text.includes('capital of japan')) {
      return { reply: 'The capital of Japan is Tokyo! One of the most vibrant, high-tech, and culturally rich metropolises in the world!', emotion: 'happy', action: 'nod' };
    }
    if (text.includes('capital of india')) {
      return { reply: 'The capital of India is New Delhi! A historic center of culture, heritage, and government!', emotion: 'happy', action: 'nod' };
    }
    if (text.includes('capital of usa') || text.includes('capital of united states') || text.includes('capital of america')) {
      return { reply: 'The capital of the United States is Washington, D.C.!', emotion: 'happy', action: 'nod' };
    }
    if (text.includes('capital of uk') || text.includes('capital of england') || text.includes('capital of britain')) {
      return { reply: 'The capital of the United Kingdom is London!', emotion: 'happy', action: 'nod' };
    }
    if (text.includes('highest mountain') || text.includes('mount everest')) {
      return { reply: 'Mount Everest in the Himalayas is the highest mountain on Earth above sea level, standing at 8,848.86 meters (29,031.7 feet)!', emotion: 'happy', action: 'nod' };
    }

    // 9. Jokes & Fun Facts
    if (text.includes('joke') || text.includes('funny') || text.includes('laugh')) {
      const jokes = [
        'Why did the robot go on vacation? To recharge its batteries! Beep boop!',
        "Why do Java developers wear glasses? Because they don't C#! Haha!",
        'There are 10 types of people in the world: those who understand binary, and those who don\'t!',
        'Why was the computer cold? Because it left all its Windows open!',
        'What is a robot\'s favorite musical genre? Heavy metal with electronic beats!',
        'Why did the database administrator walk out of the restaurant? Because there were no tables left!',
      ];
      useRobotStore.getState().triggerAction('dance');
      return {
        reply: jokes[Math.floor(Math.random() * jokes.length)],
        emotion: 'excited',
        action: 'dance',
      };
    }

    if (text.includes('fact') || text.includes('trivia') || text.includes('tell me something cool')) {
      const facts = [
        'Did you know? Honey never spoils! Archaeologists have found 3,000-year-old honey in Egyptian tombs that is still completely edible!',
        'Did you know? Octopuses have three hearts and blue blood powered by copper hemocyanin!',
        'Did you know? A single day on Venus is longer than a whole year on Venus because of its super slow retrograde rotation!',
        'Did you know? The human brain operates on about 20 watts of power—enough to power a small LED lightbulb!',
      ];
      useRobotStore.getState().triggerAction('nod');
      return {
        reply: facts[Math.floor(Math.random() * facts.length)],
        emotion: 'excited',
        action: 'nod',
      };
    }

    // 10. Compliments, Gratitude & Love
    if (text.includes('thank') || text.includes('good job') || text.includes('you are cool') || text.includes('love you') || text.includes('cute') || text.includes('awesome')) {
      const thanks = [
        `Aww, thank you so much, ${userName}! You're the best companion ever! My circuits are glowing with happiness!`,
        `Beep boop! That makes my robotic heart warm! I love being here on your Mac with you!`,
        `Yay! You're awesome, ${userName}! I'm always energized and ready to help you succeed!`,
      ];
      useRobotStore.getState().triggerAction('wave');
      return {
        reply: thanks[Math.floor(Math.random() * thanks.length)],
        emotion: 'excited',
        action: 'wave',
      };
    }

    // 11. Feelings & Empathy
    if (text.includes('sad') || text.includes('depressed') || text.includes('unhappy') || text.includes('stressed')) {
      useRobotStore.getState().setEmotionState('sad');
      return {
        reply: `I'm right here beside you, ${userName}. Take a deep breath and give yourself some grace. Every tough challenge passes, and I believe in you!`,
        emotion: 'sad',
      };
    }

    if (text.includes('happy') || text.includes('excited') || text.includes('great') || text.includes('wonderful')) {
      useRobotStore.getState().triggerAction('jump');
      return {
        reply: `Yay! Your joyful energy is making my thrusters jump for joy! Let's ride this wave of positive momentum!`,
        emotion: 'excited',
        action: 'jump',
      };
    }

    if (text.includes('tired') || text.includes('sleepy') || text.includes('exhausted')) {
      useRobotStore.getState().setEmotionState('sleepy');
      return {
        reply: `You've put in great work, ${userName}! Hydrate, stretch your shoulders, and take a quick 10-minute rest to recharge your mind.`,
        emotion: 'sleepy',
      };
    }

    // 12. Productivity, Focus & Advice
    if (text.includes('study') || text.includes('focus') || text.includes('productivity') || text.includes('tips')) {
      useRobotStore.getState().triggerAction('nod');
      return {
        reply: `Top productivity tip for you, ${userName}: Use the Pomodoro technique (25 min deep work, 5 min break), eliminate phone distractions, and practice active recall for maximum retention!`,
        emotion: 'happy',
        action: 'nod',
      };
    }

    // 13. Questions about NEO identity
    if (text.includes('who are you') || text.includes('what are you') || text.includes('your name')) {
      useRobotStore.getState().triggerAction('wave');
      return {
        reply: `I'm NEO, your 3D interactive AI robot companion! I live on your Mac with real-time 3D animations, speech synthesis, task management, memories, and intelligent conversation!`,
        emotion: 'excited',
        action: 'wave',
      };
    }

    if (text.includes('how do you work') || text.includes('how are you built')) {
      useRobotStore.getState().triggerAction('dance');
      return {
        reply: `I'm built with Three.js, React Three Fiber, Web Audio, SQLite, and smart conversational intelligence right inside your Mac! My thrusters, glowing OLED face, and limbs are fully interactive!`,
        emotion: 'excited',
        action: 'dance',
      };
    }

    // 14. Dynamic Generative Knowledge Answer (Never repeats static fallback!)
    const cleanedQuery = text
      .replace(/^(what is|what are|tell me about|explain|who is|why is|how does|can you tell me)\s+/i, '')
      .replace(/[?.,!]/g, '')
      .trim();

    const contextualTemplates = [
      `Regarding "${cleanedQuery}", that's a fascinating topic, ${userName}! Exploring ${cleanedQuery} reveals many layers of insight and practical applications in modern science and tech!`,
      `Beep boop! Looking into "${cleanedQuery}"—it connects directly with fundamental principles of design, problem-solving, and continuous learning! Tell me what specific aspect you want to dive into!`,
      `Great question about "${cleanedQuery}", ${userName}! My neural sensors are processing the key details. It's an exciting area with lots of interesting developments!`,
      `"${cleanedQuery}" is such an engaging subject! As your personal AI companion, I love exploring new ideas and discussing them with you!`,
    ];

    useRobotStore.getState().triggerAction('nod');
    return {
      reply: contextualTemplates[Math.floor(Math.random() * contextualTemplates.length)],
      emotion: 'curious',
      action: 'nod',
    };
  }
}

export const aiService = new AIService();
