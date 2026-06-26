import { mapRssError } from '@/lib/rssErrors'

export function mapConnectorError(error: unknown, connectorType?: string): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    if (message.includes('api key') || message.includes('not configured')) {
      return 'API key not configured. Add your key in Settings → API Keys.'
    }

    if (message.includes('rate limit') || message.includes('429')) {
      return 'Connector rate limit reached. Try again later.'
    }

    if (message.includes('not implemented')) {
      return `${connectorType ?? 'Connector'} is not implemented yet.`
    }

    if (message.includes('reddit') || message.includes('hacker news') || message.includes('newsapi')) {
      return error.message
    }
  }

  return mapRssError(error)
}
