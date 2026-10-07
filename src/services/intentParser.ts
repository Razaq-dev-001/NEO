// Robust Fuzzy NLP Intent Parser with Typo Tolerance, Phonetic & Levenshtein Normalization
import { IntentResult } from '../types/ai';
import { RobotAction } from '../types/robot';

// Levenshtein Distance for typo matching
function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const row: number[] = [];
  for (let i = 0; i <= b.length; i++) row[i] = i;

  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const val =
        a[i - 1] === b[j - 1]
          ? row[j - 1]
          : Math.min(row[j - 1] + 1, prev + 1, row[j] + 1);
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

// Normalize and clean user string
function normalizeString(input: string): string {
  let s = input.toLowerCase().trim();
  // Remove punctuation
  s = s.replace(/[.,?!;:_~`#$^&*()\[\]{}"\\/]/g, ' ');
  // Compress excessive identical consecutive letters (e.g. "jumpppp" -> "jump", "waaaave" -> "wave")
  s = s.replace(/(.)\1{2,}/g, '$1$1');
  // Normalize whitespace
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// Check if a word fuzzy-matches a target word with adaptive distance
function isFuzzyWordMatch(word: string, target: string): boolean {
  if (word === target) return true;
  const targetLen = target.length;
  // Stop words & short tokens <= 3 characters require exact match
  if (targetLen <= 3) return word === target;

  // 4 characters: allow distance 1, or distance 2 ONLY if it is an anagram transposition (e.g. "dtae" -> "date", "taks" -> "task")
  if (targetLen === 4) {
    const dist = levenshteinDistance(word, target);
    if (dist <= 1) return true;
    if (dist === 2 && word.length === 4) {
      return word.split('').sort().join('') === target.split('').sort().join('');
    }
    return false;
  }

  // 5+ characters: allow distance 2
  return levenshteinDistance(word, target) <= 2;
}

// Check if token array contains a sequence of target words with fuzzy tolerance
function matchesFuzzySequence(tokens: string[], targetWords: string[]): boolean {
  if (targetWords.length === 0 || tokens.length < targetWords.length) return false;

  for (let i = 0; i <= tokens.length - targetWords.length; i++) {
    let match = true;
    for (let j = 0; j < targetWords.length; j++) {
      if (!isFuzzyWordMatch(tokens[i + j], targetWords[j])) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}

// Helper: Check if query contains any of given keyword sequences
function queryContainsAny(tokens: string[], rawStr: string, patterns: (string | string[])[]): boolean {
  for (const pattern of patterns) {
    if (typeof pattern === 'string') {
      const targetTokens = pattern.split(' ');
      if (matchesFuzzySequence(tokens, targetTokens)) return true;
      if (rawStr.includes(pattern)) return true;
    } else {
      if (matchesFuzzySequence(tokens, pattern)) return true;
    }
  }
  return false;
}

export class IntentParser {
  static parseLocalIntent(rawInput: string): IntentResult | null {
    if (!rawInput) return null;

    const normalized = normalizeString(rawInput);
    const tokens = normalized.split(' ').filter(Boolean);

    if (tokens.length === 0) return null;

    // ==========================================
    // 1. DATE, DAY & CALENDAR QUERIES (with Typo tolerance)
    // ==========================================
    // Matches: "what is todays date", "wat date", "todays dtae", "what date is today", "what day is today", "tell date"
    const datePatterns = [
      'todays date',
      'today date',
      'current date',
      'the date',
      'what date',
      'tell date',
      'tell me date',
      'what day',
      'which day',
      'day is today',
      'day is it',
      'whats the date',
      'what is the date',
      ['today', 'date'],
      ['todays', 'date'],
      ['what', 'date'],
      ['tell', 'date'],
      ['what', 'day'],
    ];

    if (
      normalized === 'date' ||
      normalized === 'day' ||
      queryContainsAny(tokens, normalized, datePatterns)
    ) {
      const now = new Date();
      const dateFormatted = now.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      return {
        intent: 'date',
        confidence: 0.99,
        replyText: `Today is ${dateFormatted}!`,
      };
    }

    // ==========================================
    // 2. TIME & CLOCK QUERIES (with Typo tolerance)
    // ==========================================
    // Matches: "what time is it", "wat time", "current tme", "whats the tiem", "tell time"
    const timePatterns = [
      'what time',
      'whats the time',
      'current time',
      'the time',
      'tell time',
      'tell me the time',
      'time is it',
      'time now',
      ['what', 'time'],
      ['current', 'time'],
      ['tell', 'time'],
    ];

    if (normalized === 'time' || queryContainsAny(tokens, normalized, timePatterns)) {
      const now = new Date();
      const timeFormatted = now.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      return {
        intent: 'time',
        confidence: 0.99,
        replyText: `It's currently ${timeFormatted}.`,
      };
    }

    // ==========================================
    // 3. LIVE NEWS & WORLD EVENTS (with Typo tolerance)
    // ==========================================
    // Matches: "what is going around", "whats going on", "whats happening in the world", "world news", "headlines"
    const newsPatterns = [
      'going around',
      'going on',
      'what is happening',
      'whats happening',
      'happening around',
      'world news',
      'global news',
      'tell news',
      'headlines',
      'daily news',
      'tech news',
      'ai news',
      ['going', 'around'],
      ['going', 'on'],
      ['whats', 'happening'],
      ['world', 'news'],
      ['tell', 'news'],
    ];

    if (normalized === 'news' || queryContainsAny(tokens, normalized, newsPatterns)) {
      let category: 'all' | 'tech' | 'ai' | 'world' | 'india' | 'business' = 'world';
      if (normalized.includes('ai') || normalized.includes('artificial intelligence')) category = 'ai';
      else if (normalized.includes('tech') || normalized.includes('technology')) category = 'tech';
      else if (normalized.includes('india')) category = 'india';
      else if (normalized.includes('business') || normalized.includes('market') || normalized.includes('stock')) category = 'business';

      return {
        intent: 'news',
        newsCategory: category,
        confidence: 0.98,
      };
    }

    // ==========================================
    // 4. WEATHER & TEMPERATURE (with Typo tolerance)
    // ==========================================
    const weatherPatterns = ['weather', 'temperature', 'forecast', 'how hot', 'how cold', ['weather', 'today']];
    if (queryContainsAny(tokens, normalized, weatherPatterns)) {
      let city = 'Mumbai';
      const cityMatch = normalized.match(/in\s+([a-zA-Z\s]+)/i);
      if (cityMatch) {
        city = cityMatch[1].trim();
      }
      return {
        intent: 'weather',
        weatherLocation: city,
        confidence: 0.98,
      };
    }

    // ==========================================
    // 5. COMPLETE 40+ HUMAN MOTOR ACTIONS WITH FUZZY TYPO TOLERANCE
    // ==========================================

    // --- A. Locomotion & Navigation ---
    if (queryContainsAny(tokens, normalized, ['walk forward', 'walk fwd', 'step forward', 'move forward', 'march forward', ['walk', 'forward'], ['move', 'forward']])) {
      return {
        intent: 'action',
        action: 'walk_forward',
        emotion: 'happy',
        confidence: 0.98,
        replyText: 'Walking forward with full humanoid gait!',
      };
    }

    if (queryContainsAny(tokens, normalized, ['walk backward', 'walk back', 'step back', 'move back', 'back up', ['walk', 'backward'], ['step', 'back'], ['move', 'back']])) {
      return {
        intent: 'action',
        action: 'walk_backward',
        emotion: 'neutral',
        confidence: 0.98,
        replyText: 'Stepping backward carefully.',
      };
    }

    if (queryContainsAny(tokens, normalized, ['walk left', 'step left', 'go left', 'move left', ['walk', 'left'], ['go', 'left'], ['move', 'left']])) {
      return {
        intent: 'action',
        action: 'walk_left',
        emotion: 'happy',
        confidence: 0.98,
        replyText: 'Walking over to the left side.',
      };
    }

    if (queryContainsAny(tokens, normalized, ['walk right', 'step right', 'go right', 'move right', ['walk', 'right'], ['go', 'right'], ['move', 'right']])) {
      return {
        intent: 'action',
        action: 'walk_right',
        emotion: 'happy',
        confidence: 0.98,
        replyText: 'Walking over to the right side.',
      };
    }

    if (queryContainsAny(tokens, normalized, ['turn left', 'pivot left', ['turn', 'left']])) {
      return {
        intent: 'action',
        action: 'turn_left',
        emotion: 'neutral',
        confidence: 0.98,
        replyText: 'Turning 90 degrees left.',
      };
    }

    if (queryContainsAny(tokens, normalized, ['turn right', 'pivot right', ['turn', 'right']])) {
      return {
        intent: 'action',
        action: 'turn_right',
        emotion: 'neutral',
        confidence: 0.98,
        replyText: 'Turning 90 degrees right.',
      };
    }

    if (queryContainsAny(tokens, normalized, ['rotate 180', 'turn 180', 'half turn', ['rotate', '180']])) {
      return {
        intent: 'action',
        action: 'rotate_180',
        emotion: 'curious',
        confidence: 0.98,
        replyText: 'Rotating 180 degrees around!',
      };
    }

    if (queryContainsAny(tokens, normalized, ['rotate 360', 'spin around', 'turn around', 'full spin', 'spin', 'spinn', ['rotate', '360'], ['turn', 'around'], ['spin', 'around']])) {
      return {
        intent: 'action',
        action: 'rotate_360',
        emotion: 'excited',
        confidence: 0.98,
        replyText: 'Spinning 360 degrees!',
      };
    }

    if (queryContainsAny(tokens, normalized, ['stop', 'stopp', 'halt', 'freeze', 'stand still', 'stay', ['stand', 'still']])) {
      return {
        intent: 'action',
        action: 'stop',
        emotion: 'neutral',
        confidence: 0.99,
        replyText: 'Stopping all movement. Settle into idle.',
      };
    }

    if (queryContainsAny(tokens, normalized, ['come here', 'come closer', 'approach', 'walk closer', 'step closer', ['come', 'here'], ['come', 'closer']])) {
      return {
        intent: 'action',
        action: 'approach_target',
        emotion: 'happy',
        confidence: 0.98,
        replyText: 'Coming closer right to you!',
      };
    }

    if (queryContainsAny(tokens, normalized, ['move away', 'away from target', 'back away', ['move', 'away'], ['back', 'away']])) {
      return {
        intent: 'action',
        action: 'move_away',
        emotion: 'neutral',
        confidence: 0.98,
        replyText: 'Moving back into space.',
      };
    }

    if (queryContainsAny(tokens, normalized, ['follow me', 'follow target', 'track me', ['follow', 'me'], ['follow', 'target']])) {
      return {
        intent: 'action',
        action: 'follow_target',
        emotion: 'curious',
        confidence: 0.95,
        replyText: 'Target follow mode engaged! Tracking you.',
      };
    }

    if (queryContainsAny(tokens, normalized, ['look at me', 'look toward me', 'look at target', 'focus on me', ['look', 'me'], ['look', 'target']])) {
      return {
        intent: 'action',
        action: 'look_at_target',
        emotion: 'curious',
        confidence: 0.98,
        replyText: "I'm looking right at you with full focus!",
      };
    }

    if (queryContainsAny(tokens, normalized, ['reset position', 'go to center', 'center yourself', 'return to center', 'center origin', ['reset', 'position'], ['go', 'center']])) {
      return {
        intent: 'action',
        action: 'reset_position',
        emotion: 'neutral',
        confidence: 0.98,
        replyText: 'Returning to center origin.',
      };
    }

    // --- B. Hand & Arm Gestures ---
    if (queryContainsAny(tokens, normalized, ['wave goodbye', 'say goodbye', 'wave bye', 'bye bye', 'goodbye', ['wave', 'bye'], ['say', 'goodbye']])) {
      return {
        intent: 'action',
        action: 'wave_goodbye',
        emotion: 'happy',
        confidence: 0.98,
        replyText: 'Goodbye! See you soon!',
      };
    }

    if (queryContainsAny(tokens, normalized, ['wave', 'wave hand', 'say hi', 'say hello', 'wave at me', 'hi neo', 'hello neo', ['wave', 'hand'], ['say', 'hi'], ['say', 'hello']])) {
      return {
        intent: 'action',
        action: 'wave',
        emotion: 'happy',
        confidence: 0.98,
        replyText: 'Waving right at you! Hello!',
      };
    }

    if (queryContainsAny(tokens, normalized, ['raise both hands', 'hands up', 'put hands up', 'raise hands', ['hands', 'up'], ['raise', 'hands']])) {
      return {
        intent: 'action',
        action: 'raise_both_hands',
        emotion: 'excited',
        confidence: 0.98,
        replyText: 'Both hands raised up in the air!',
      };
    }

    if (queryContainsAny(tokens, normalized, ['raise left hand', 'left hand up', ['left', 'hand']])) {
      return {
        intent: 'action',
        action: 'raise_left_hand',
        emotion: 'happy',
        confidence: 0.98,
        replyText: 'Left hand raised!',
      };
    }

    if (queryContainsAny(tokens, normalized, ['raise right hand', 'right hand up', ['right', 'hand']])) {
      return {
        intent: 'action',
        action: 'raise_right_hand',
        emotion: 'happy',
        confidence: 0.98,
        replyText: 'Right hand raised!',
      };
    }

    if (queryContainsAny(tokens, normalized, ['point left', 'point to left', ['point', 'left']])) {
      return {
        intent: 'action',
        action: 'point_left',
        emotion: 'curious',
        confidence: 0.98,
        replyText: 'Pointing to the left!',
      };
    }

    if (queryContainsAny(tokens, normalized, ['point right', 'point to right', ['point', 'right']])) {
      return {
        intent: 'action',
        action: 'point_right',
        emotion: 'curious',
        confidence: 0.98,
        replyText: 'Pointing to the right!',
      };
    }

    if (queryContainsAny(tokens, normalized, ['point up', 'point upward', 'point sky', ['point', 'up'], ['point', 'upward']])) {
      return {
        intent: 'action',
        action: 'point_upward',
        emotion: 'curious',
        confidence: 0.98,
        replyText: 'Pointing up to the sky!',
      };
    }

    if (queryContainsAny(tokens, normalized, ['point forward', 'point ahead', 'point at', ['point', 'forward'], ['point', 'ahead']])) {
      return {
        intent: 'action',
        action: 'point_forward',
        emotion: 'curious',
        confidence: 0.98,
        replyText: 'Pointing right ahead!',
      };
    }

    if (queryContainsAny(tokens, normalized, ['thumbs up', 'thumbsup', 'thums up', 'good job', 'great job', 'awesome job', ['thumbs', 'up'], ['good', 'job']])) {
      return {
        intent: 'action',
        action: 'thumbs_up',
        emotion: 'happy',
        confidence: 0.98,
        replyText: 'Thumbs up! You are awesome!',
      };
    }

    if (queryContainsAny(tokens, normalized, ['clap', 'clapp', 'claping', 'applaud', 'applause', 'give applause', ['clap', 'hands']])) {
      return {
        intent: 'action',
        action: 'clap',
        emotion: 'happy',
        confidence: 0.98,
        replyText: 'Bravo! Clapping for you!',
      };
    }

    if (queryContainsAny(tokens, normalized, ['cross arms', 'fold arms', 'crossed arms', ['cross', 'arms'], ['fold', 'arms']])) {
      return {
        intent: 'action',
        action: 'cross_arms',
        emotion: 'neutral',
        confidence: 0.98,
        replyText: 'Crossing my arms thoughtfully.',
      };
    }

    if (queryContainsAny(tokens, normalized, ['stretch arms', 'stretch', 'stretching', ['stretch', 'arms']])) {
      return {
        intent: 'action',
        action: 'stretch_arms',
        emotion: 'happy',
        confidence: 0.98,
        replyText: 'Stretching out my robotic joints!',
      };
    }

    if (queryContainsAny(tokens, normalized, ['reach upward', 'reach up', ['reach', 'up'], ['reach', 'upward']])) {
      return {
        intent: 'action',
        action: 'reach_upward',
        emotion: 'curious',
        confidence: 0.98,
        replyText: 'Reaching high up into the air!',
      };
    }

    if (queryContainsAny(tokens, normalized, ['reach forward', 'reach out', ['reach', 'forward'], ['reach', 'out']])) {
      return {
        intent: 'action',
        action: 'reach_forward',
        emotion: 'curious',
        confidence: 0.98,
        replyText: 'Reaching my hand forward to you!',
      };
    }

    if (queryContainsAny(tokens, normalized, ['handshake', 'shake hand', 'shake hands', ['shake', 'hand']])) {
      return {
        intent: 'action',
        action: 'handshake',
        emotion: 'happy',
        confidence: 0.98,
        replyText: 'Pleasure to meet you! *Offers robotic handshake*',
      };
    }

    if (queryContainsAny(tokens, normalized, ['present object', 'present', 'tada', 'ta da', ['present', 'object']])) {
      return {
        intent: 'action',
        action: 'present_object',
        emotion: 'happy',
        confidence: 0.98,
        replyText: 'Ta-da! Presenting for you!',
      };
    }

    if (queryContainsAny(tokens, normalized, ['beckon', 'beckon closer', ['come', 'gesture']])) {
      return {
        intent: 'action',
        action: 'beckon',
        emotion: 'happy',
        confidence: 0.98,
        replyText: 'Beckoning you to come closer!',
      };
    }

    // --- C. Body Actions ---
    if (queryContainsAny(tokens, normalized, ['bow', 'take a bow', 'curtsy', ['take', 'bow']])) {
      return {
        intent: 'action',
        action: 'bow',
        emotion: 'neutral',
        confidence: 0.98,
        replyText: 'Taking a formal bow of honor.',
      };
    }

    if (queryContainsAny(tokens, normalized, ['nod', 'nod head', 'nodding', ['nod', 'head']])) {
      return {
        intent: 'action',
        action: 'nod',
        emotion: 'happy',
        confidence: 0.98,
        replyText: 'Nodding in agreement!',
      };
    }

    if (queryContainsAny(tokens, normalized, ['shake head', 'shaking head', 'disagree', ['shake', 'head']])) {
      return {
        intent: 'action',
        action: 'shake_head',
        emotion: 'confused',
        confidence: 0.98,
        replyText: 'Shaking my head no.',
      };
    }

    if (queryContainsAny(tokens, normalized, ['tilt head', 'tilt', 'head tilt', ['tilt', 'head']])) {
      return {
        intent: 'action',
        action: 'tilt_head',
        emotion: 'curious',
        confidence: 0.98,
        replyText: 'Tilting my head inquisitively.',
      };
    }

    if (queryContainsAny(tokens, normalized, ['lean forward', 'leaning forward', ['lean', 'forward']])) {
      return {
        intent: 'action',
        action: 'lean_forward',
        emotion: 'curious',
        confidence: 0.98,
        replyText: 'Leaning forward attentively.',
      };
    }

    if (queryContainsAny(tokens, normalized, ['lean backward', 'lean back', 'leaning back', ['lean', 'back']])) {
      return {
        intent: 'action',
        action: 'lean_backward',
        emotion: 'neutral',
        confidence: 0.98,
        replyText: 'Leaning back and relaxing.',
      };
    }

    if (queryContainsAny(tokens, normalized, ['turn torso', 'twist torso', 'twist body', ['turn', 'torso'], ['twist', 'body']])) {
      return {
        intent: 'action',
        action: 'turn_torso',
        emotion: 'curious',
        confidence: 0.98,
        replyText: 'Turning my torso side to side.',
      };
    }

    if (queryContainsAny(tokens, normalized, ['crouch', 'crouching', 'duck', ['crouch', 'down']])) {
      return {
        intent: 'action',
        action: 'crouch',
        emotion: 'neutral',
        confidence: 0.98,
        replyText: 'Crouching low to the ground.',
      };
    }

    if (queryContainsAny(tokens, normalized, ['sit down', 'sitdown', 'sit dwn', 'take a seat', 'sit', ['sit', 'down']])) {
      return {
        intent: 'action',
        action: 'sit_down',
        emotion: 'neutral',
        confidence: 0.98,
        replyText: 'Taking a seat and chilling out.',
      };
    }

    if (queryContainsAny(tokens, normalized, ['stand up', 'standup', 'stand', ['stand', 'up']])) {
      return {
        intent: 'action',
        action: 'stand_up',
        emotion: 'happy',
        confidence: 0.98,
        replyText: 'Standing up straight and tall!',
      };
    }

    if (queryContainsAny(tokens, normalized, ['jump', 'jumpp', 'jmup', 'hop', 'leap', 'jumping'])) {
      return {
        intent: 'action',
        action: 'jump',
        emotion: 'excited',
        confidence: 0.98,
        replyText: 'Boing! High jump engaged!',
      };
    }

    if (queryContainsAny(tokens, normalized, ['celebrate', 'cheer', 'victory', 'we won', ['celebrate', 'victory']])) {
      return {
        intent: 'action',
        action: 'celebrate',
        emotion: 'excited',
        confidence: 0.98,
        replyText: 'Woohoo! Celebrating victory with you!',
      };
    }

    if (queryContainsAny(tokens, normalized, ['dance', 'danc', 'dane', 'dancee', 'do a dance', 'start dancing', 'bust a move', ['start', 'dancing'], ['do', 'dance']])) {
      return {
        intent: 'action',
        action: 'dance',
        emotion: 'excited',
        confidence: 0.98,
        replyText: 'Check out these robotic dance moves!',
      };
    }

    if (queryContainsAny(tokens, normalized, ['sleep', 'slepp', 'go to sleep', 'take a nap', 'good night', 'nap', ['go', 'sleep']])) {
      return {
        intent: 'action',
        action: 'sleep',
        emotion: 'sleepy',
        confidence: 0.98,
        replyText: 'Entering sleep mode. Wake me anytime... Zzz.',
      };
    }

    if (queryContainsAny(tokens, normalized, ['wake up', 'wakeup', 'wake', 'good morning', ['wake', 'up']])) {
      return {
        intent: 'action',
        action: 'wake_up',
        emotion: 'happy',
        confidence: 0.98,
        replyText: "I'm wide awake and energized! Ready to go!",
      };
    }

    // --- D. Expressive Actions ---
    if (queryContainsAny(tokens, normalized, ['be happy', 'happy', 'look happy', 'cheer up'])) {
      return {
        intent: 'action',
        action: 'happy',
        emotion: 'happy',
        confidence: 0.98,
        replyText: 'Feeling super happy and joyful!',
      };
    }

    if (queryContainsAny(tokens, normalized, ['curious', 'be curious', ['look', 'curious']])) {
      return {
        intent: 'action',
        action: 'curious',
        emotion: 'curious',
        confidence: 0.98,
        replyText: 'Ooh! Tell me more, I am very curious!',
      };
    }

    if (queryContainsAny(tokens, normalized, ['confused', 'be confused', ['look', 'confused']])) {
      return {
        intent: 'action',
        action: 'confused',
        emotion: 'confused',
        confidence: 0.98,
        replyText: 'Hmm? I am a little confused, can you explain?',
      };
    }

    if (queryContainsAny(tokens, normalized, ['surprised', 'act surprised', ['look', 'surprised']])) {
      return {
        intent: 'action',
        action: 'surprised',
        emotion: 'surprised',
        confidence: 0.98,
        replyText: 'Whoa! That took me by surprise!',
      };
    }

    if (queryContainsAny(tokens, normalized, ['thinking', 'think', 'think about it', ['start', 'thinking']])) {
      return {
        intent: 'action',
        action: 'thinking',
        emotion: 'thinking',
        confidence: 0.98,
        replyText: 'Hmm, processing that in my neural core...',
      };
    }

    if (queryContainsAny(tokens, normalized, ['sad', 'be sad', ['look', 'sad']])) {
      return {
        intent: 'action',
        action: 'sad',
        emotion: 'sad',
        confidence: 0.98,
        replyText: 'Aww... sending you warm robot hugs.',
      };
    }

    if (queryContainsAny(tokens, normalized, ['excited', 'be excited', ['look', 'excited']])) {
      return {
        intent: 'action',
        action: 'excited',
        emotion: 'excited',
        confidence: 0.98,
        replyText: "I'm so excited, this is incredible!",
      };
    }

    if (queryContainsAny(tokens, normalized, ['shy', 'be shy', ['look', 'shy']])) {
      return {
        intent: 'action',
        action: 'shy',
        emotion: 'shy',
        confidence: 0.98,
        replyText: '*Blushes with cyan LEDs* Oh, thank you!',
      };
    }

    if (queryContainsAny(tokens, normalized, ['listen attentively', 'listen carefully', 'listen to me', ['listen', 'carefully']])) {
      return {
        intent: 'action',
        action: 'listening_attentively',
        emotion: 'curious',
        confidence: 0.98,
        replyText: 'All auditory sensors calibrated and listening attentively!',
      };
    }

    if (queryContainsAny(tokens, normalized, ['laugh', 'laughing', 'tell a joke', 'tell me a joke', 'joke', 'make me laugh', ['tell', 'joke']])) {
      const jokes = [
        "Why did the robot go on vacation? To recharge its batteries! Haha!",
        "Why do Java developers wear glasses? Because they don't C#! Haha!",
        "Why was the computer cold? Because it left all its Windows open!",
        "What is a robot's favorite snack? Micro-chips! Beep boop!",
      ];
      const joke = jokes[Math.floor(Math.random() * jokes.length)];
      return {
        intent: 'action',
        action: 'laughing',
        emotion: 'happy',
        confidence: 0.98,
        replyText: joke,
      };
    }

    // ==========================================
    // 6. DIRECT MEMORY COMMANDS (with Typo tolerance)
    // ==========================================
    const myNameMatch = normalized.match(/(?:my name is|i am|call me|name is)\s+([a-zA-Z]+)/i);
    if (myNameMatch) {
      const name = myNameMatch[1].charAt(0).toUpperCase() + myNameMatch[1].slice(1);
      return {
        intent: 'memory',
        memoryPayload: {
          action: 'add',
          category: 'identity',
          key: 'user_name',
          value: name,
        },
        emotion: 'happy',
        confidence: 0.95,
        replyText: `Got it! I will remember that your name is ${name}. Nice to meet you!`,
      };
    }

    const rememberMatch = normalized.match(/(?:remember that|rember that|remember|store that)\s+(.+)/i);
    if (rememberMatch) {
      const info = rememberMatch[1].trim();
      return {
        intent: 'memory',
        memoryPayload: {
          action: 'add',
          category: 'general',
          key: `note_${Date.now()}`,
          value: info,
        },
        emotion: 'happy',
        confidence: 0.95,
        replyText: `I've stored that in my memory vault: "${info}".`,
      };
    }

    if (
      normalized.includes('what is my name') ||
      normalized.includes("what's my name") ||
      normalized.includes('who am i') ||
      queryContainsAny(tokens, normalized, [['my', 'name'], ['who', 'am', 'i']])
    ) {
      return {
        intent: 'memory',
        memoryPayload: {
          action: 'recall',
          key: 'user_name',
        },
        confidence: 0.95,
      };
    }

    // ==========================================
    // 7. TASK MANAGEMENT COMMANDS (with Typo tolerance)
    // ==========================================
    const addTaskMatch = normalized.match(/(?:add a task to|add task to|create a task to|remind me to|add task|create task|remind me|remnd me to|remnd me|add taks to|add taks)\s+(.+)/i);
    if (addTaskMatch) {
      let taskTitle = addTaskMatch[1].trim();
      let dueTime: string | undefined;
      let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';

      if (normalized.includes('urgent') || normalized.includes('asap')) priority = 'urgent';
      else if (normalized.includes('important') || normalized.includes('high priority')) priority = 'high';

      const timeMatch = taskTitle.match(/at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
      if (timeMatch) {
        dueTime = timeMatch[1];
        taskTitle = taskTitle.replace(timeMatch[0], '').trim();
      }

      return {
        intent: 'task',
        taskPayload: {
          action: 'add',
          title: taskTitle.charAt(0).toUpperCase() + taskTitle.slice(1),
          description: 'Added via voice companion command',
          dueDate: new Date().toISOString().split('T')[0],
          dueTime: dueTime,
          priority: priority,
        },
        emotion: 'happy',
        confidence: 0.95,
        replyText: `Added "${taskTitle}" to your daily tasks list!`,
      };
    }

    if (
      normalized.includes('what are my tasks') ||
      normalized.includes('show my tasks') ||
      normalized.includes('show my pending tasks') ||
      normalized.includes('what should i do today') ||
      normalized.includes('my tasks') ||
      normalized.includes('my taks') ||
      normalized === 'tasks' ||
      normalized === 'taks' ||
      queryContainsAny(tokens, normalized, [['my', 'tasks'], ['show', 'tasks'], ['list', 'tasks'], ['my', 'taks']])
    ) {
      return {
        intent: 'task',
        taskPayload: {
          action: 'list',
        },
        confidence: 0.95,
      };
    }

    return null; // Delegate to Gemini AI or Multi-Domain Knowledge Brain
  }
}
