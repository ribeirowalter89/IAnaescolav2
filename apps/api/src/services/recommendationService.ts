import { config } from "../config.js";
import { createEmbedding } from "./aiService.js";

type Suggestion = {
  type: string;
  title: string;
  url: string;
  thumbnailUrl?: string;
  duration?: string;
  source: string;
  relevanceScore: number;
};

const curatedSources = [
  { title: "Khan Academy Brasil", url: "https://pt.khanacademy.org/", source: "Khan Academy", type: "site" },
  { title: "Brasil Escola", url: "https://brasilescola.uol.com.br/", source: "Brasil Escola", type: "site" },
  { title: "Mundo Educação", url: "https://mundoeducacao.uol.com.br/", source: "Mundo Educação", type: "site" },
  { title: "Nova Escola", url: "https://novaescola.org.br/", source: "Nova Escola", type: "site" },
  { title: "Canal Manual do Mundo", url: "https://www.youtube.com/@manualdomundo", source: "YouTube", type: "video" }
];

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function fetchYoutubeVideos(query: string): Promise<Suggestion[]> {
  if (!config.youtubeApiKey) return [];

  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("maxResults", "5");
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("key", config.youtubeApiKey);
  searchUrl.searchParams.set("relevanceLanguage", "pt");

  const response = await fetch(searchUrl);
  if (!response.ok) return [];
  const json = (await response.json()) as any;

  return (json.items ?? []).map((item: any) => ({
    type: "video",
    title: item.snippet.title,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    thumbnailUrl: item.snippet.thumbnails?.medium?.url,
    duration: "YouTube",
    source: "YouTube",
    relevanceScore: 0.85
  }));
}

export async function generateSuggestions(params: {
  topic: string;
  gradeLabel: string;
  subject: string;
}): Promise<Suggestion[]> {
  const query = `explicação ${params.topic} para ${params.gradeLabel} em português`;
  const videos = await fetchYoutubeVideos(query);

  const topicEmbedding = await createEmbedding(`${params.subject} ${params.topic} ${params.gradeLabel}`);
  const scoredSources = await Promise.all(
    curatedSources.map(async (source) => {
      const emb = await createEmbedding(`${source.title} ${source.source}`);
      return {
        ...source,
        relevanceScore: emb.length ? Number(cosineSimilarity(topicEmbedding, emb).toFixed(2)) : 0.62
      };
    })
  );

  const socialQuick = [
    {
      type: "short_video",
      title: `Reels educativos sobre ${params.topic}`,
      url: `https://www.instagram.com/explore/tags/${encodeURIComponent(params.topic.replace(/\s+/g, ""))}/`,
      source: "Instagram Reels",
      relevanceScore: 0.7
    },
    {
      type: "short_video",
      title: `TikTok Edu: ${params.topic}`,
      url: "https://www.tiktok.com/tag/educacao",
      source: "TikTok Edu",
      relevanceScore: 0.68
    }
  ];

  return [...videos, ...scoredSources, ...socialQuick]
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 10);
}