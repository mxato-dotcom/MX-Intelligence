import type { EntityType } from '@/intelligence/entities/EntityType'
import styles from './EntityTypeIcon.module.css'

const ENTITY_ICON_MAP: Partial<Record<EntityType, string>> = {
  Person: '👤',
  Organization: '🏢',
  Company: '🏛',
  Technology: '⚙',
  Country: '🌍',
  City: '🏙',
  Cryptocurrency: '₿',
  Keyword: '🔖',
  Product: '📦',
}

interface EntityTypeIconProps {
  entityType: EntityType
  className?: string
}

export function EntityTypeIcon({ entityType, className }: EntityTypeIconProps) {
  const icon = ENTITY_ICON_MAP[entityType] ?? '◆'

  return (
    <span className={`${styles.icon} ${className ?? ''}`} aria-hidden="true">
      {icon}
    </span>
  )
}
