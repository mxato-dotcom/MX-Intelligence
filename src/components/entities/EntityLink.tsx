import { Link } from 'react-router-dom'
import type { EntityType } from '@/intelligence/entities/EntityType'
import { entityDetailPath, entityProfilePath } from '@/lib/constants'

interface EntityLinkProps {
  label: string
  entityType?: EntityType
  entityId?: string
  className?: string
}

export function EntityLink({ label, entityType, entityId, className }: EntityLinkProps) {
  const to = entityId
    ? entityProfilePath(entityId)
    : entityType
      ? entityDetailPath(entityType, label)
      : entityProfilePath(label)

  return (
    <Link to={to} className={className}>
      {label}
    </Link>
  )
}
