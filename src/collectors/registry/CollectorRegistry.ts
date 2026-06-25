import type { ICollector } from '@/collectors/types'
import { GitHubCollector } from '@/collectors/github/GitHubCollector'
import { NewsApiCollector } from '@/collectors/newsapi/NewsApiCollector'
import { RSSCollector } from '@/collectors/rss/RSSCollector'
import { YouTubeCollector } from '@/collectors/youtube/YouTubeCollector'

const collectorInstances: ICollector[] = [
  new RSSCollector(),
  new YouTubeCollector(),
  new GitHubCollector(),
  new NewsApiCollector(),
]

const collectorMap = new Map<string, ICollector>(
  collectorInstances.map((collector) => [collector.type, collector]),
)

/** Unregistered source types fall back to RSS collector for mock runs. */
const fallbackCollector = new RSSCollector()

export function getCollectorByType(sourceType: string): ICollector {
  return collectorMap.get(sourceType) ?? fallbackCollector
}

export function getRegisteredCollectorTypes(): string[] {
  return collectorInstances.map((collector) => collector.type)
}
