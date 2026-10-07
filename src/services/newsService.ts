import { NewsArticle } from '../types/news';

class NewsService {
  private cache: Record<string, { articles: NewsArticle[]; timestamp: number }> = {};
  private CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  private RSS_FEEDS: Record<string, string[]> = {
    ai: [
      'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://news.google.com/rss/search?q=Artificial+Intelligence+AI&hl=en-US&gl=US&ceid=US:en'),
      'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://techcrunch.com/category/artificial-intelligence/feed/'),
    ],
    tech: [
      'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en'),
      'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://feeds.feedburner.com/TechCrunch/'),
    ],
    world: [
      'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US&ceid=US:en'),
      'https://api.allorigins.win/raw?url=' + encodeURIComponent('http://feeds.bbci.co.uk/news/world/rss.xml'),
    ],
    india: [
      'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://news.google.com/rss/headlines/section/topic/NATION?hl=en-IN&gl=IN&ceid=IN:en'),
    ],
    business: [
      'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en'),
    ],
  };

  async getNews(category: string = 'tech', forceRefresh = false): Promise<NewsArticle[]> {
    const cat = category.toLowerCase();
    const now = Date.now();

    if (!forceRefresh && this.cache[cat] && now - this.cache[cat].timestamp < this.CACHE_TTL) {
      return this.cache[cat].articles;
    }

    const feedUrls = this.RSS_FEEDS[cat] || this.RSS_FEEDS.tech;
    const articles: NewsArticle[] = [];

    for (const url of feedUrls) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
        if (!res.ok) continue;

        const xmlText = await res.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const items = xmlDoc.querySelectorAll('item');

        items.forEach((item, index) => {
          if (index >= 8) return; // Top 8 per feed
          const title = item.querySelector('title')?.textContent || '';
          let link = item.querySelector('link')?.textContent || '';
          const pubDate = item.querySelector('pubDate')?.textContent || new Date().toISOString();
          const descriptionRaw = item.querySelector('description')?.textContent || '';
          const source = item.querySelector('source')?.textContent || 'Google News';

          // Clean HTML from description
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = descriptionRaw;
          const cleanDesc = tempDiv.textContent || tempDiv.innerText || title;

          if (title) {
            articles.push({
              id: `news-${Math.random().toString(36).substring(2, 9)}`,
              title: title.replace(/ - [^-]+$/, ''), // remove trailing source from google title
              summary: cleanDesc.slice(0, 180) + (cleanDesc.length > 180 ? '...' : ''),
              source: source || 'News Network',
              url: link,
              category: cat,
              publishedAt: new Date(pubDate).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }),
            });
          }
        });

        if (articles.length >= 6) break;
      } catch (err) {
        console.warn(`Failed to fetch RSS for ${url}:`, err);
      }
    }

    // Fallback if network fails
    if (articles.length === 0) {
      articles.push({
        id: 'news-fb-1',
        title: 'Latest Developments in Autonomous Artificial Intelligence',
        summary: 'New agentic reasoning frameworks demonstrate multimodal real-time tool calling and physical companion robotics.',
        source: 'AI Gazette',
        url: 'https://news.google.com',
        category: cat,
        publishedAt: 'Just now',
      });
      articles.push({
        id: 'news-fb-2',
        title: 'Next-Generation Web3D & Spatial Computing Innovations',
        summary: 'Advances in browser-based WebGL & WebGPU deliver photorealistic interactive companion avatars on desktop devices.',
        source: 'Tech Trends',
        url: 'https://news.google.com',
        category: cat,
        publishedAt: '1 hour ago',
      });
    }

    this.cache[cat] = {
      articles,
      timestamp: now,
    };

    return articles;
  }

  // Generates a concise spoken briefing for NEO
  formatSpokenBriefing(articles: NewsArticle[], category: string = 'tech'): string {
    if (articles.length === 0) {
      return `I couldn't retrieve the latest ${category} news right now, but I will check again soon.`;
    }

    const top = articles.slice(0, 3);
    const headlines = top.map((a, i) => `${i + 1}: ${a.title}`).join('. ');
    return `Here are the top headlines in ${category}: ${headlines}. Would you like me to read more details on any of these?`;
  }
}

export const newsService = new NewsService();
