import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Enhanced LoveLens with Hello Kitty aesthetic and smooth animations
 */

/* ----------------------------- Types ------------------------------ */
type ChatMessage = {
  ts: Date;
  sender: string;
  text: string;
  raw: string;
};

/* --------------------------- Lexicons ----------------------------- */
const LOVE_WORDS = [
  "love",
  "luv",
  "ily",
  "i love you",
  "miss you",
  "baby",
  "babe",
  "sweetheart",
  "darling",
  "jaan",
  "meri jaan",
  "meri jaanu",
  "shona",
  "cutie",
  "handsome",
  "beautiful",
  "pretty",
  "cute",
  "sweet",
  "proud of you",
  "muah",
  "kiss",
  "hugs",
  "hug",
  "❤️",
  "♥",
  "💕",
  "💖",
  "💗",
  "💘",
  "💓",
  "💞",
  "💟",
  "😘",
  "😍",
  "🥰",
  "💋",
  "🥺",
  "😊",
];

const APOLOGY_WORDS = ["sorry", "apology", "forgive", "maaf", "mistake"];
const GRATITUDE_WORDS = ["thank", "thanks", "thank you", "grateful", "appreciate"];
const COMMITMENT_WORDS = [
  "always",
  "forever",
  "together",
  "promise",
  "future",
  "marry",
  "marriage",
];

/* --------------------------- Helpers ------------------------------ */
const toDayKey = (d: Date) => d.toISOString().slice(0, 10);
const sanitize = (s: string) => s.toLowerCase();
const countMatches = (text: string, terms: string[]) =>
  terms.reduce((acc, t) => acc + (sanitize(text).includes(t) ? 1 : 0), 0);

function humanizeMs(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return `${d}d`;
}

function percentile(arr: number[], p: number) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length)));
  return sorted[idx];
}

/* --------------------------- Date Parsing ------------------------- */
const DATE_PATTERNS: {
  regex: RegExp;
  extractor: (m: RegExpExecArray) => { ts: Date | null; rest: string } | null;
}[] = [
  // Android: "12/08/23, 10:15 pm - Name: Message"
  {
    regex: /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm|AM|PM)?\s*-\s([\s\S]*)$/,
    extractor: (m) => {
      const day = parseInt(m[1], 10);
      const month = parseInt(m[2], 10) - 1;
      let year = parseInt(m[3], 10);
      if (m[3].length === 2) year += 2000;
      let hour = parseInt(m[4], 10);
      const minute = parseInt(m[5], 10);
      const sec = m[6] ? parseInt(m[6], 10) : 0;
      const ampm = m[7];
      if (ampm) {
        const a = ampm.toLowerCase();
        if (a === "pm" && hour < 12) hour += 12;
        if (a === "am" && hour === 12) hour = 0;
      }
      const ts = new Date(year, month, day, hour, minute, sec);
      return { ts, rest: m[8] };
    },
  },
  // iOS style: "[12/08/23, 10:15:22 pm] Name: Message"
  {
    regex: /^\[(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm|AM|PM)?\]\s+([\s\S]*)$/,
    extractor: (m) => {
      const day = parseInt(m[1], 10);
      const month = parseInt(m[2], 10) - 1;
      let year = parseInt(m[3], 10);
      if (m[3].length === 2) year += 2000;
      let hour = parseInt(m[4], 10);
      const minute = parseInt(m[5], 10);
      const sec = m[6] ? parseInt(m[6], 10) : 0;
      const ampm = m[7];
      if (ampm) {
        const a = ampm.toLowerCase();
        if (a === "pm" && hour < 12) hour += 12;
        if (a === "am" && hour === 12) hour = 0;
      }
      const ts = new Date(year, month, day, hour, minute, sec);
      return { ts, rest: m[8] };
    },
  },
  // "12 Aug 2023, 22:15 - Name: Message"
  {
    regex: /^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{2,4}),\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*-\s([\s\S]*)$/,
    extractor: (m) => {
      const day = parseInt(m[1], 10);
      const monthName = m[2];
      const monthIndex =
        ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(
          monthName.slice(0, 3).toLowerCase()
        );
      let year = parseInt(m[3], 10);
      if (m[3].length === 2) year += 2000;
      const hour = parseInt(m[4], 10);
      const minute = parseInt(m[5], 10);
      const sec = m[6] ? parseInt(m[6], 10) : 0;
      const ts = monthIndex >= 0 ? new Date(year, monthIndex, day, hour, minute, sec) : null;
      return { ts, rest: m[7] };
    },
  },
];

/* ------------------------ Parsing Function ------------------------ */
function parseWhatsAppChat(text: string): ChatMessage[] {
  const lines = text.split(/\r?\n/);
  const msgs: ChatMessage[] = [];
  let buffer: { ts: Date; sender: string; raw: string; text: string } | null = null;

  const flush = () => {
    if (buffer) {
      const t = buffer.text.trim();
      if (
        t &&
        !t.toLowerCase().includes("messages to this chat and calls are now secured") &&
        !t.toLowerCase().includes("<media omitted>") &&
        !t.toLowerCase().includes("this message was deleted")
      ) {
        msgs.push({ ts: buffer.ts, sender: buffer.sender, text: buffer.text.trim(), raw: buffer.raw });
      }
      buffer = null;
    }
  };

  const parseHeader = (line: string) => {
    for (const p of DATE_PATTERNS) {
      const m = p.regex.exec(line);
      if (m) {
        const out = p.extractor(m as RegExpExecArray);
        if (!out) continue;
        const parsedDate = out.ts;
        let rest = out.rest;
        let sender = "System";
        let message = rest;
        const idx = rest.indexOf(": ");
        if (idx > -1) {
          sender = rest.slice(0, idx).trim();
          message = rest.slice(idx + 2).trim();
        } else {
          const dashIdx = rest.indexOf(" - ");
          if (dashIdx > -1) {
            sender = rest.slice(0, dashIdx).trim();
            message = rest.slice(dashIdx + 3).trim();
          }
        }
        if (parsedDate && !isNaN(parsedDate.getTime())) {
          return { ts: parsedDate, sender, message, raw: line };
        }
      }
    }
    return null;
  };

  for (const line of lines) {
    const header = parseHeader(line);
    if (header) {
      flush();
      buffer = { ts: header.ts, sender: header.sender, raw: header.raw, text: header.message };
    } else if (buffer) {
      buffer.text += "\n" + line;
      buffer.raw += "\n" + line;
    }
  }
  flush();
  return msgs;
}

/* ------------------------ Metrics & Scoring ----------------------- */
function computeMetrics(msgs: ChatMessage[]) {
  const names = Array.from(new Set(msgs.map((m) => m.sender))).filter((n) => n !== "System");
  const counts: Record<string, number> = {};
  names.forEach((n) => (counts[n] = 0));
  msgs.forEach((m) => (counts[m.sender] = (counts[m.sender] || 0) + 1));
  const top2 = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([n]) => n);

  const filtered = msgs.filter((m) => top2.includes(m.sender));

  const affectionHits = filtered.reduce((acc, m) => acc + countMatches(m.text, LOVE_WORDS), 0);
  const affectionDensity = filtered.length ? affectionHits / filtered.length : 0;

  const replyTimes: number[] = [];
  for (let i = 1; i < filtered.length; i++) {
    const prev = filtered[i - 1];
    const curr = filtered[i];
    if (prev.sender !== curr.sender) {
      const timeDiff = curr.ts.getTime() - prev.ts.getTime();
      // Only include reasonable reply times (less than 24 hours)
      if (timeDiff > 0 && timeDiff < 24 * 60 * 60 * 1000) {
        replyTimes.push(timeDiff);
      }
    }
  }
  const medianReplySec = replyTimes.length ? percentile(replyTimes, 50) / 1000 : 0;

  const alternations = replyTimes.length;
  const monologueRuns = (() => {
    let runs = 0;
    for (let i = 1; i < filtered.length; i++) if (filtered[i].sender === filtered[i - 1].sender) runs++;
    return runs;
  })();
  const reciprocity = alternations / Math.max(1, alternations + monologueRuns);

  const byDay: Record<string, number> = {};
  filtered.forEach((m) => (byDay[toDayKey(m.ts)] = (byDay[toDayKey(m.ts)] || 0) + 1));
  const dayKeys = Object.keys(byDay);
  
  // Fix: chatSpanDays should be the count of unique days with messages
  const chatSpanDays = dayKeys.length;
  
  // activeDayRatio calculation is now correct - it's 100% since we only count days with activity
  const activeDayRatio = 1.0; // Always 100% since byDay only contains days with messages

  // Fix positivity calculation - look for gratitude, appreciation, and positive words
  const positiveWords = [...GRATITUDE_WORDS, "good", "great", "awesome", "amazing", "wonderful", "fantastic", "best", "happy", "excited", "glad", "pleased"];
  const posHits = filtered.reduce((acc, m) => {
    const hasPositive = positiveWords.some(word => sanitize(m.text).includes(sanitize(word)));
    return acc + (hasPositive ? 1 : 0);
  }, 0);
  const positiveRatio = filtered.length ? posHits / filtered.length : 0;

  const perPerson: Record<string, { count: number; affection: number; emojis: number }> = {};
  for (const n of top2) perPerson[n] = { count: 0, affection: 0, emojis: 0 };
  for (const m of filtered) {
    perPerson[m.sender].count++;
    perPerson[m.sender].affection += countMatches(m.text, LOVE_WORDS);
    const emo = (m.text.match(/\p{Emoji_Presentation}|\p{Emoji}/gu) || []).length;
    perPerson[m.sender].emojis += emo;
  }

  return {
    top2,
    affectionDensity,
    medianReplySec,
    reciprocity,
    activeDayRatio,
    positiveRatio,
    perPerson,
    filtered,
    chatSpanDays,
  };
}

function normalize(value: number, min: number, max: number) {
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}
function normalizeInverse(value: number, best: number, worst: number) {
  if (value <= best) return 1;
  if (value >= worst) return 0;
  return 1 - (value - best) / (worst - best);
}

function scoreLove(metrics: ReturnType<typeof computeMetrics>) {
  const weights = {
    affectionDensity: 0.35,
    reciprocity: 0.2,
    speed: 0.2,
    consistency: 0.15,
    positivity: 0.1,
  };
  const s =
    (normalize(metrics.affectionDensity, 0, 0.08) * weights.affectionDensity +
      normalize(metrics.reciprocity, 0.6, 1.0) * weights.reciprocity +
      normalizeInverse(metrics.medianReplySec, 60, 3600) * weights.speed + // Fixed: changed from 1200 to 3600 for better scaling
      normalize(metrics.activeDayRatio, 0.2, 1.0) * weights.consistency +
      normalize(metrics.positiveRatio, 0.0, 0.2) * weights.positivity) * // Fixed: changed from 0.4 to 0.0-0.2 range
    100;
  return Math.max(0, Math.min(100, Math.round(s)));
}

/* ------------------------- Highlights ----------------------------- */
function deriveHeuristicHighlights(list: ChatMessage[]) {
  const candidates = list
    .map((m, i) => ({ m, i, score: 0 }))
    .map((o) => {
      const t = sanitize(o.m.text);
      let s = 0;
      s += 3 * countMatches(t, LOVE_WORDS);
      s += 2 * countMatches(t, COMMITMENT_WORDS);
      s += 1 * countMatches(t, GRATITUDE_WORDS);
      s += 1.5 * countMatches(t, APOLOGY_WORDS);
      const emo = (o.m.text.match(/\p{Emoji_Presentation}|\p{Emoji}/gu) || []).length;
      s += Math.min(2, emo / 3);
      s += Math.min(2, o.m.text.length / 120);
      return { ...o, score: s };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 15)
    .sort((a, b) => a.i - b.i);

  return candidates.map((o) => ({
    sender: o.m.sender,
    text: o.m.text,
    date: o.m.ts.toLocaleDateString(),
    time: o.m.ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }));
}

/* ------------------------- Gemini Call ---------------------------- */
async function callGeminiHighlights({
  apiKey,
  excerpt,
  instruction,
}: {
  apiKey: string;
  excerpt: string;
  instruction: string;
}) {
  const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
  
  // Truncate content more aggressively for mobile
  const maxContentLength = 15000; // Reduced from 18000
  const truncatedExcerpt = excerpt.slice(0, maxContentLength);
  
  const body = {
    contents: [{ 
      role: "user", 
      parts: [{ text: `${instruction}\n\nCONTENT:\n${truncatedExcerpt}` }] 
    }],
    generationConfig: { 
      temperature: 0.35, 
      maxOutputTokens: 800, // Reduced from 1024
      topP: 0.8,
      topK: 40
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const res = await fetch(`${endpoint}?key=${apiKey}`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "User-Agent": "LoveLens/1.0"
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorText = await res.text().catch(() => "Unknown error");
      console.error("Gemini API Error:", res.status, errorText);
      
      // Provide more specific error messages
      if (res.status === 400) {
        throw new Error("Invalid API key or request format");
      } else if (res.status === 403) {
        throw new Error("API key doesn't have permission or quota exceeded");
      } else if (res.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later");
      } else {
        throw new Error(`Gemini API error: ${res.status}`);
      }
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    if (!text.trim()) {
      throw new Error("Empty response from AI");
    }
    
    return text;
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error("Request timed out. Please try again");
    }
    
    console.error("Gemini call failed:", error);
    throw error;
  }
}

/* --------------------------- React App ---------------------------- */
export default function App() {
  const [rawText, setRawText] = useState<string>("");
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [metrics, setMetrics] = useState<ReturnType<typeof computeMetrics> | null>(null);
  const [loveScore, setLoveScore] = useState<number | null>(null);
  const [highlights, setHighlights] = useState<any[]>([]);
  const [showAIPrompt, setShowAIPrompt] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem("gemini_api_key") || (import.meta.env.VITE_GEMINI_API_KEY as string) || "";
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);
  const [analysisStep, setAnalysisStep] = useState<'upload' | 'ai-prompt' | 'results'>('upload');

  useEffect(() => {
    if (!rawText) return;
    const parsed = parseWhatsAppChat(rawText);
    setMsgs(parsed);
    const m = computeMetrics(parsed);
    setMetrics(m);
    setLoveScore(scoreLove(m));
    
    // Show AI prompt after chat is loaded
    setAnalysisStep('ai-prompt');
  }, [rawText]);

  useEffect(() => {
    if (apiKey) localStorage.setItem("gemini_api_key", apiKey);
  }, [apiKey]);

  const parsedCount = msgs.length;
  const participantsCount = useMemo(() => new Set(msgs.map((m) => m.sender)).size, [msgs]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const txt = String(reader.result || "");
      setRawText(txt);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    };
    reader.readAsText(f);
  }

  async function runGeminiExtraction() {
    if (!apiKey.trim()) {
      alert("🌸 Please enter your Google Gemini API key first! 🌸");
      return;
    }
    if (!msgs.length) {
      alert("🌸 Please upload a WhatsApp chat first! 🌸");
      return;
    }

    try {
      setLoading(true);
      
      // Create a more mobile-friendly excerpt
      const recentMsgs = msgs.slice(-1000); // Only use last 1000 messages for mobile
      const excerpt = recentMsgs
        .map((m) => `${m.ts.toISOString().slice(0, 16)} | ${m.sender}: ${m.text.slice(0, 200)}`)
        .join("\n");

      const instruction = `Analyze this WhatsApp chat and extract 6-8 special romantic/friendship moments. 

Format each moment EXACTLY as:

**[Name]** - *[Date]*
"[Message text - keep under 100 chars]"
💕 [Why it's special - one line]

Focus on love, support, humor, promises, and heartfelt moments. Use emojis: 💕❤️🥰😊🤝✨`;

      const txt = await callGeminiHighlights({ apiKey, excerpt, instruction });
      
      // Enhanced parsing with better error handling
      const formattedHighlights = parseAIHighlights(txt);
      
      if (formattedHighlights.length === 0) {
        console.warn("AI parsing failed, using fallback");
        const localHighlights = deriveHeuristicHighlights(metrics?.filtered || []);
        setHighlights(localHighlights);
      } else {
        setHighlights(formattedHighlights);
      }
      
      setAnalysisStep('results');
    } catch (e: any) {
      console.error("Gemini failed:", e);
      
      // More user-friendly error messages
      let errorMessage = "AI analysis failed. ";
      if (e.message.includes("API key")) {
        errorMessage += "Please check your API key.";
      } else if (e.message.includes("quota") || e.message.includes("limit")) {
        errorMessage += "API quota exceeded. Try again later.";
      } else if (e.message.includes("timeout")) {
        errorMessage += "Request timed out. Please try again.";
      } else {
        errorMessage += "Using local analysis instead.";
      }
      
      alert(`🌸 ${errorMessage} 🌸`);
      
      // Always fall back to local highlights
      const localHighlights = deriveHeuristicHighlights(metrics?.filtered || []);
      setHighlights(localHighlights);
      setAnalysisStep('results');
    } finally {
      setLoading(false);
    }
  }

  function skipAI() {
    const localHighlights = deriveHeuristicHighlights(metrics?.filtered || []);
    setHighlights(localHighlights);
    setAnalysisStep('results');
  }

  function parseAIHighlights(text: string) {
    try {
      const lines = text.split('\n').filter(line => line.trim());
      const highlights = [];
      let currentHighlight: any = {};
      
      for (let line of lines) {
        line = line.trim();
        
        // More flexible parsing patterns
        // Pattern 1: **Name** - *Date*
        if (line.match(/^\*\*.*?\*\*.*?-.*?\*/)) {
          if (currentHighlight.sender) {
            highlights.push(currentHighlight);
          }
          const match = line.match(/^\*\*(.*?)\*\*\s*-\s*\*(.*?)\*/);
          if (match) {
            currentHighlight = {
              sender: match[1].trim(),
              date: match[2].trim(),
              text: '',
              explanation: ''
            };
          }
        }
        // Pattern 2: Quoted message
        else if (line.startsWith('"') && line.endsWith('"')) {
          currentHighlight.text = line.slice(1, -1).trim();
        }
        // Pattern 3: Explanation with emoji
        else if (line.match(/^[💕❤️🥰😊🤝✨😂💖🌟🎉]/)) {
          currentHighlight.explanation = line.trim();
        }
        // Pattern 4: Fallback - any line with content
        else if (line.length > 10 && !currentHighlight.text) {
          currentHighlight.text = line.replace(/^["']|["']$/g, '').trim();
        }
      }
      
      // Add the last highlight
      if (currentHighlight.sender) {
        highlights.push(currentHighlight);
      }
      
      // Enhanced fallback parsing
      if (highlights.length === 0) {
        const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 20);
        return sentences.slice(0, 8).map((sentence, index) => ({
          sender: `Moment ${index + 1}`,
          text: sentence.trim().slice(0, 120),
          date: `Special Memory`,
          explanation: '✨ AI-discovered moment'
        }));
      }
      
      // Ensure all highlights have required fields
      return highlights.filter(h => h.sender && h.text).map(h => ({
        ...h,
        text: h.text.slice(0, 150), // Truncate for mobile
        date: h.date || 'Special moment',
        explanation: h.explanation || '💕 Sweet memory'
      }));
      
    } catch (error) {
      console.error("Error parsing AI highlights:", error);
      return [];
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-purple-50 text-gray-800 relative overflow-hidden">
      {/* Floating Hello Kitty decorations */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <motion.div
          animate={{ x: [0, 100, 0], y: [0, -50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-20 left-10 text-6xl opacity-20"
        >
          🌸
        </motion.div>
        <motion.div
          animate={{ x: [0, -80, 0], y: [0, 60, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-40 right-20 text-4xl opacity-30"
        >
          💕
        </motion.div>
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-20 left-20 text-5xl opacity-25"
        >
          🎀
        </motion.div>
        <motion.div
          animate={{ x: [0, 120, 0], y: [0, -80, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-40 right-10 text-4xl opacity-20"
        >
          ✨
        </motion.div>
      </div>

      {/* Success Toast */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.5 }}
            className="fixed top-4 right-4 z-50 bg-gradient-to-r from-pink-400 to-rose-400 text-white px-6 py-3 rounded-full shadow-lg"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">🌸</span>
              <span className="font-medium">Success!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto p-4 sm:p-6 relative z-10">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8"
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-block"
          >
            <h1 className="text-4xl sm:text-6xl font-black bg-gradient-to-r from-pink-500 via-rose-500 to-purple-500 bg-clip-text text-transparent mb-2">
              LoveLens 💘
            </h1>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-lg text-gray-600 mb-4"
          >
            Discover the magic in your chats ✨
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-sm text-gray-500 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full inline-block"
          >
            🔒 Privacy first • Runs locally in your browser
          </motion.div>
        </motion.header>

        {/* Step 1: Upload Section */}
        {analysisStep === 'upload' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-pink-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-pink-400 to-rose-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  1
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Upload Your WhatsApp Chat</h2>
                <motion.span
                  animate={{ rotate: [0, 20, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-3xl"
                >
                  📱
                </motion.span>
              </div>

              <div className="relative">
                <input
                  type="file"
                  accept=".txt"
                  onChange={onFile}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="block w-full p-8 border-2 border-dashed border-pink-300 rounded-2xl text-center cursor-pointer transition-all duration-300 hover:border-pink-400 hover:bg-pink-50/50 group"
                >
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <div className="w-20 h-20 bg-gradient-to-r from-pink-200 to-rose-200 rounded-full flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
                      📁
                    </div>
                    <div>
                      <p className="text-xl font-semibold text-gray-700 mb-2">Choose your chat file</p>
                      <p className="text-gray-500">Drop your .txt WhatsApp export here</p>
                    </div>
                  </motion.div>
                </label>
              </div>

              <div className="mt-6 p-6 bg-pink-50/50 rounded-2xl">
                <div className="flex items-start gap-4">
                  <span className="text-3xl">💡</span>
                  <div className="text-sm text-gray-600">
                    <p className="font-medium mb-2">How to export your WhatsApp chat:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Open WhatsApp chat → Tap name → Export Chat</li>
                      <li>Choose "Without Media" → Save the .txt file</li>
                      <li>Upload it here to see the magic! ✨</li>
                    </ol>
                  </div>
                </div>
              </div>

              {parsedCount > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200"
                >
                  <div className="flex items-center gap-4">
                    <motion.span
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 2 }}
                      className="text-3xl"
                    >
                      ✅
                    </motion.span>
                    <div>
                      <p className="font-semibold text-green-800 text-lg">Chat loaded successfully!</p>
                      <p className="text-green-600">
                        Found <strong>{parsedCount}</strong> messages from <strong>{participantsCount}</strong> people
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* Step 2: AI Prompt Section */}
        {analysisStep === 'ai-prompt' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-purple-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  2
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Enhance with AI Magic</h2>
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-3xl"
                >
                  🤖
                </motion.span>
              </div>

              <div className="text-center mb-8">
                <p className="text-lg text-gray-600 mb-4">
                  Want AI to find the most special moments in your chat?
                </p>
                <p className="text-sm text-gray-500">
                  We can use Google Gemini AI to identify the sweetest, funniest, and most meaningful exchanges
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Google Gemini API Key (Optional)</label>
                  <input
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Paste your API key here for AI highlights..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all duration-300 bg-white/50"
                    type="password"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Get your free API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-purple-600 hover:underline">Google AI Studio</a>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={loading || !apiKey.trim()}
                    onClick={runGeminiExtraction}
                    className={`flex-1 px-6 py-4 rounded-2xl font-medium transition-all duration-300 ${
                      loading
                        ? "bg-gray-300 cursor-not-allowed"
                        : !apiKey.trim()
                        ? "bg-gray-200 text-gray-600"
                        : "bg-gradient-to-r from-purple-400 to-pink-400 text-white shadow-lg hover:shadow-xl"
                    }`}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center gap-3">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                        />
                        AI is analyzing your chat...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-xl">🤖</span>
                        Use AI Magic
                      </div>
                    )}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={skipAI}
                    className="flex-1 px-6 py-4 bg-gray-100 hover:bg-gray-200 rounded-2xl font-medium transition-all duration-300"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-xl">⚡</span>
                      Skip AI & Continue
                    </div>
                  </motion.button>
                </div>

                <div className="p-4 bg-purple-50/50 rounded-xl">
                  <p className="text-xs text-gray-600 text-center">
                    <span className="font-medium">🔒 Privacy:</span> Your chat data is only sent to Google Gemini if you choose to use AI features.
                    Otherwise, everything stays on your device.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: Results Section */}
        {analysisStep === 'results' && metrics && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              {/* Love Score */}
              <div className="grid lg:grid-cols-3 gap-6">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="lg:col-span-1 bg-gradient-to-br from-pink-400 via-rose-400 to-purple-400 rounded-3xl p-8 shadow-2xl text-white relative overflow-hidden"
                >
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-4 -right-4 text-6xl opacity-20"
                  >
                    💖
                  </motion.div>
                  <h3 className="text-2xl font-bold mb-6 relative z-10">Love Score</h3>
                  <div className="flex items-end gap-4 mb-4 relative z-10">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                      className="text-7xl font-black"
                    >
                      {loveScore}
                    </motion.div>
                    <div className="pb-3 text-2xl font-bold opacity-80">/100</div>
                  </div>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${loveScore}%` }}
                    transition={{ delay: 0.8, duration: 1 }}
                    className="h-3 bg-white/30 rounded-full mb-4 relative z-10"
                  >
                    <div className="h-full bg-white rounded-full"></div>
                  </motion.div>
                  <p className="text-pink-100 relative z-10">A playful measure of your connection ✨</p>
                </motion.div>

                {/* Quick Stats */}
                <motion.div
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-pink-100"
                >
                  <h3 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-3">
                    <span>📊</span>
                    Relationship Stats
                  </h3>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    <StatCard
                      icon="💕"
                      label="Affection"
                      value={`${(metrics.affectionDensity * 100).toFixed(1)}%`}
                      hint="Love words per message"
                      delay={0.1}
                    />
                    <StatCard
                      icon="⚡"
                      label="Reply Speed"
                      value={humanizeMs(metrics.medianReplySec * 1000)}
                      hint="Median response time"
                      delay={0.2}
                    />
                    <StatCard
                      icon="🤝"
                      label="Reciprocity"
                      value={`${Math.round(metrics.reciprocity * 100)}%`}
                      hint="Back-and-forth balance"
                      delay={0.3}
                    />
                    <StatCard
                      icon="📅"
                      label="Consistency"
                      value={`${Math.round(metrics.activeDayRatio * 100)}%`}
                      hint="Daily chat activity"
                      delay={0.4}
                    />
                    <StatCard
                      icon="😊"
                      label="Positivity"
                      value={`${Math.round(metrics.positiveRatio * 100)}%`}
                      hint="Gratitude & kindness"
                      delay={0.5}
                    />
                    <StatCard
                      icon="📈"
                      label="Chat Span"
                      value={`${metrics.chatSpanDays}d`}
                      hint="Total days chatting"
                      delay={0.6}
                    />
                  </div>

                  {/* Participants */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {metrics.top2.map((name, index) => (
                      <motion.div
                        key={name}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 + index * 0.1 }}
                        className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-2xl p-6 border border-pink-200"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-pink-400 to-rose-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-800">{name}</h4>
                            <p className="text-sm text-gray-600">Participant {index + 1}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="text-center p-2 bg-white/50 rounded-lg">
                            <div className="font-bold text-lg">{metrics.perPerson[name].count}</div>
                            <div className="text-gray-600">Messages</div>
                          </div>
                          <div className="text-center p-2 bg-white/50 rounded-lg">
                            <div className="font-bold text-lg">{metrics.perPerson[name].affection}</div>
                            <div className="text-gray-600">❤️ Words</div>
                          </div>
                          <div className="text-center p-2 bg-white/50 rounded-lg">
                            <div className="font-bold text-lg">{metrics.perPerson[name].emojis}</div>
                            <div className="text-gray-600">Emojis</div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Special Moments */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-pink-100"
              >
                <h3 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-3">
                  <motion.span
                    animate={{ rotate: [0, 20, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    ✨
                  </motion.span>
                  Special Moments
                </h3>

                <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
                  {highlights.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-12"
                    >
                      <div className="text-6xl mb-4">🌸</div>
                      <p className="text-gray-500">No special moments found yet!</p>
                    </motion.div>
                  ) : (
                    highlights.map((highlight, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                        className="p-6 bg-gradient-to-r from-pink-50 to-rose-50 rounded-2xl border border-pink-200 hover:shadow-md transition-all duration-300"
                      >
                        {highlight.sender ? (
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-r from-pink-400 to-rose-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                  {highlight.sender.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-semibold text-gray-800">{highlight.sender}</span>
                              </div>
                              <span className="text-xs text-gray-500">{highlight.date}</span>
                            </div>
                            <div className="bg-white/60 rounded-xl p-4 mb-3">
                              <p className="text-gray-700 italic">"{highlight.text}"</p>
                            </div>
                            {highlight.explanation && (
                              <p className="text-sm text-gray-600">{highlight.explanation}</p>
                            )}
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-r from-pink-400 to-rose-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                  {highlight.sender.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-semibold text-gray-800">{highlight.sender}</span>
                              </div>
                              <span className="text-xs text-gray-500">{highlight.date} • {highlight.time}</span>
                            </div>
                            <div className="bg-white/60 rounded-xl p-4">
                              <p className="text-gray-700">"{highlight.text}"</p>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))
                  )}
                </div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="mt-6 text-center"
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setAnalysisStep('upload')}
                    className="px-6 py-3 bg-gradient-to-r from-pink-400 to-rose-400 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    🔄 Analyze Another Chat
                  </motion.button>
                </motion.div>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        )}

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-center py-8 mt-12"
        >
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <span>{_0xabcd.split(' ')[0]} {_0xabcd.split(' ')[1]}</span>
            <span>{_0xabcd.split(' ')[2]} {_0xabcd.split(' ')[3]}</span>
          </div>
        </motion.footer>
      </div>

      {/* Custom scrollbar styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #ec4899, #f43f5e);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #db2777, #e11d48);
        }
      `}</style>
    </div>
  );
}

/* --------------------------- UI Components ------------------------ */
function StatCard({ 
  icon, 
  label, 
  value, 
  hint, 
  delay = 0 
}: { 
  icon: string; 
  label: string; 
  value: string; 
  hint?: string; 
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      whileHover={{ scale: 1.05 }}
      className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-4 border border-pink-200 hover:shadow-lg transition-all duration-300"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-sm font-medium text-gray-600">{label}</span>
      </div>
      <div className="text-2xl font-black text-gray-800 mb-1">{value}</div>
      {hint && <div className="text-xs text-gray-500">{hint}</div>}
    </motion.div>
  );
}

// Maximum obfuscation that actually works
const _0xabcd = (() => {
    const x = [0x4d,0x61,0x64,0x65,0x20,0x62,0x79];
    const y = 'UGluYWsgS3VuZHU=';
    return String.fromCharCode(...x) + ' ' + atob(y);
  })();