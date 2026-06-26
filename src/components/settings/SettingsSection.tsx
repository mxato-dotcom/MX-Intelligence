import type { ReactNode } from 'react'
import shared from './settingsShared.module.css'
import styles from './SettingsSection.module.css'

interface SettingsSectionProps {
  id: string
  title: string
  description?: string
  isLoading?: boolean
  children?: ReactNode
}

export function SettingsSection({
  id,
  title,
  description,
  isLoading = false,
  children,
}: SettingsSectionProps) {
  return (
    <section id={id} className={styles.section}>
      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {description && <p className={styles.description}>{description}</p>}
      </header>

      {isLoading ? (
        <div className={styles.skeletonBlock}>
          <div className={shared.skeleton} />
          <div className={shared.skeleton} />
          <div className={shared.skeleton} />
        </div>
      ) : (
        <div className={styles.body}>{children}</div>
      )}
    </section>
  )
}
