import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Newspaper,
  CloudSun,
  ExternalLink,
  Volume2,
  RefreshCw,
  Wind,
  Droplets,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useSettingsStore } from '../../state/settingsStore';
import { useConversationStore } from '../../state/conversationStore';
import { newsService } from '../../services/newsService';
import { weatherService } from '../../services/weatherService';
import { speechService } from '../../services/speechService';
import { soundFx } from '../../services/audioSynthesizer';
import { NewsArticle, WeatherData } from '../../types/news';

export const NewsDrawer: React.FC = () => {
  const activeDrawer = useSettingsStore((s) => s.activeDrawer);
  const toggleDrawer = useSettingsStore((s) => s.toggleDrawer);
  const userLocation = useSettingsStore((s) => s.userLocation);

  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [category, setCategory] = useState<string>('ai');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const isNewsDrawerOpen = useConversationStore((s) => s.isNewsDrawerOpen);
  const setNewsDrawerOpen = useConversationStore((s) => s.setNewsDrawerOpen);

  const isOpen = activeDrawer === 'news' || isNewsDrawerOpen;

  const loadData = async (cat = category, force = false) => {
    setIsLoading(true);
    try {
      const [fetchedArticles, fetchedWeather] = await Promise.all([
        newsService.getNews(cat, force),
        weatherService.getWeather(userLocation || 'Mumbai'),
      ]);
      setArticles(fetchedArticles);
      setWeather(fetchedWeather);
    } catch (err) {
      console.error('Failed to load news/weather:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData(category);
    }
  }, [isOpen, category, userLocation]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (activeDrawer === 'news') toggleDrawer('news');
    if (isNewsDrawerOpen) setNewsDrawerOpen(false);
  };

  const handleReadBriefing = () => {
    soundFx.playWakeChime();
    const spoken = newsService.formatSpokenBriefing(articles, category);
    speechService.speak(spoken);
  };

  const categories = [
    { id: 'ai', label: 'AI & Robotics' },
    { id: 'tech', label: 'Technology' },
    { id: 'world', label: 'World' },
    { id: 'india', label: 'India' },
    { id: 'business', label: 'Business' },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 420 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 420 }}
        transition={{ type: 'spring', damping: 25, stiffness: 280 }}
        className="fixed top-0 right-0 bottom-0 w-full max-w-lg bg-[#0e1422]/95 backdrop-blur-2xl border-l border-white/[0.08] shadow-2xl z-40 flex flex-col"
      >
        {/* Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Newspaper className="w-5 h-5 text-emerald-400" />
              <span>Live News & Current Info</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Real-time verified RSS feeds & live meteorology
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => loadData(category, true)}
              disabled={isLoading}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all"
              title="Refresh Feed"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>

            <button
              onClick={handleReadBriefing}
              className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all text-xs flex items-center space-x-1"
              title="Read Audio Briefing"
            >
              <Volume2 className="w-4 h-4" />
              <span className="hidden sm:inline">Briefing</span>
            </button>

            <button
              onClick={handleClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Weather Card */}
        {weather && (
          <div className="p-4 border-b border-white/[0.06] bg-gradient-to-r from-cyan-950/30 via-slate-900/30 to-emerald-950/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <CloudSun className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
                    {weather.city}
                  </span>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-black text-white font-mono">
                      {weather.temperature}°C
                    </span>
                    <span className="text-xs font-medium text-cyan-300">
                      {weather.condition}
                    </span>
                  </div>
                </div>
              </div>

              {/* Humidity / Wind Details */}
              <div className="text-right space-y-1 text-xs font-mono text-slate-300">
                <div className="flex items-center justify-end space-x-1">
                  <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{weather.humidity}%</span>
                </div>
                <div className="flex items-center justify-end space-x-1">
                  <Wind className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{weather.windSpeed} km/h</span>
                </div>
              </div>
            </div>

            {/* 3-day forecast pills */}
            <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-white/[0.06]">
              {weather.forecast.map((f, i) => (
                <div
                  key={i}
                  className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.05] text-center"
                >
                  <span className="text-[10px] text-slate-400 font-medium block mb-0.5">
                    {f.day}
                  </span>
                  <span className="text-xs font-bold text-white font-mono block">
                    {f.tempMax}°
                  </span>
                  <span className="text-[9px] text-slate-400 truncate block mt-0.5">
                    {f.condition}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Filter Tabs */}
        <div className="p-3 border-b border-white/[0.06] flex space-x-1.5 overflow-x-auto no-scrollbar">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                category === c.id
                  ? 'bg-emerald-500 text-black font-semibold shadow-md shadow-emerald-500/20'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* News Article Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {isLoading ? (
            <div className="text-center py-16 text-slate-500 text-xs">
              <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-emerald-400" />
              <p>Fetching verified live news streams...</p>
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-xs">
              <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-400" />
              <p>No articles available right now.</p>
            </div>
          ) : (
            articles.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] transition-all group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    {item.source}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>{item.publishedAt}</span>
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors leading-snug">
                  {item.title}
                </h3>

                <p className="text-xs text-slate-400 mt-2 leading-relaxed line-clamp-3">
                  {item.summary}
                </p>

                {item.url && (
                  <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex justify-end">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 font-medium transition-colors"
                    >
                      <span>Read Original Source</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
