const RSS_ERROR_MESSAGES = {
  invalidUrl: 'Invalid URL. Provide a valid http or https feed address.',
  fetchFailed: 'Failed to fetch feed. The server could not retrieve the RSS URL.',
  non200: 'Feed returned non-200 status. The feed server rejected or failed the request.',
  empty: 'Empty feed. The response did not contain RSS content.',
  network: 'Cannot reach server. Check the feed URL and your connection.',
  timeout: 'Timeout. The feed took too long to respond.',
  invalid: 'Invalid RSS feed. The response is not valid XML or RSS.',
  emptyItems: 'Feed contains no items.',
  unknown: 'An unexpected error occurred while processing the feed.',
} as const

export function mapRssError(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'AbortError' || error.message.toLowerCase().includes('abort')) {
      return RSS_ERROR_MESSAGES.timeout
    }

    const message = error.message.toLowerCase()

    if (message.includes('invalid url')) {
      return RSS_ERROR_MESSAGES.invalidUrl
    }

    if (message.includes('failed to fetch feed')) {
      return RSS_ERROR_MESSAGES.fetchFailed
    }

    if (message.includes('non-200') || message.includes('returned non-200')) {
      return RSS_ERROR_MESSAGES.non200
    }

    if (message === 'empty feed' || message.includes('empty feed')) {
      return RSS_ERROR_MESSAGES.empty
    }

    if (message.includes('invalid rss') || message.includes('invalid xml') || message.includes('parse')) {
      return RSS_ERROR_MESSAGES.invalid
    }

    if (message.includes('no items') || message.includes('feed contains no items')) {
      return RSS_ERROR_MESSAGES.emptyItems
    }

    if (
      message.includes('fetch') ||
      message.includes('network') ||
      message.includes('failed to fetch') ||
      message.includes('cannot reach')
    ) {
      return RSS_ERROR_MESSAGES.network
    }

    return error.message
  }

  return RSS_ERROR_MESSAGES.unknown
}

export { RSS_ERROR_MESSAGES }
