import type { ReactNode } from 'react'
import styles from './PageContainer.module.css'

interface PageContainerProps {
  title: string
  description?: string
  children?: ReactNode
}

export function PageContainer({ title, description, children }: PageContainerProps) {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {description && <p className={styles.description}>{description}</p>}
      </header>
      {children && <div className={styles.body}>{children}</div>}
    </div>
  )
}
