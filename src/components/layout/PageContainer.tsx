import type { ReactNode } from 'react'
import styles from './PageContainer.module.css'

interface PageContainerProps {
  title: string
  description?: string
  actions?: ReactNode
  children?: ReactNode
}

export function PageContainer({ title, description, actions, children }: PageContainerProps) {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <h2 className={styles.title}>{title}</h2>
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
        {description && <p className={styles.description}>{description}</p>}
      </header>
      {children && <div className={styles.body}>{children}</div>}
    </div>
  )
}
