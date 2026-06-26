export const ENTITY_TYPES = [
  'Person',
  'Organization',
  'Country',
  'City',
  'Technology',
  'Company',
  'Currency',
  'Cryptocurrency',
  'Stock',
  'Product',
  'Software',
  'Programming Language',
  'Website',
  'Domain',
  'Email',
  'Phone Number',
  'Date',
  'Time',
  'Location',
  'Hashtag',
  'Keyword',
] as const

export type EntityType = (typeof ENTITY_TYPES)[number]

export function isEntityType(value: string): value is EntityType {
  return (ENTITY_TYPES as readonly string[]).includes(value)
}
