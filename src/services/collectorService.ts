import { getCollectorByType as resolveCollector } from '@/collectors/registry/CollectorRegistry'
import type {
  CollectorContext,
  CollectorRunResult,
  HealthCheckResult,
  ICollector,
  ValidationResult,
} from '@/collectors/types'
import type { Source } from '@/types/source'

export function getCollectorByType(sourceType: string): ICollector {
  return resolveCollector(sourceType)
}

export async function validateSource(source: Source): Promise<ValidationResult> {
  const collector = getCollectorByType(source.source_type)
  const context: CollectorContext = { source }

  await collector.connect(context)
  return collector.validate(context)
}

export async function runHealthCheck(source: Source): Promise<HealthCheckResult> {
  const collector = getCollectorByType(source.source_type)
  const context: CollectorContext = { source }

  await collector.connect(context)
  return collector.healthCheck(context)
}

export async function runCollector(source: Source): Promise<CollectorRunResult> {
  const collector = getCollectorByType(source.source_type)
  const context: CollectorContext = { source }

  const connect = await collector.connect(context)
  const validation = await collector.validate(context)
  const fetch = await collector.fetch(context)
  const normalized = await collector.normalize(fetch.items, context)

  return {
    connect,
    validation,
    fetch,
    normalized,
  }
}
