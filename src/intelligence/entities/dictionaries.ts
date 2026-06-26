import type { EntityType } from '@/intelligence/entities/EntityType'

export interface DictionaryEntry {
  canonical: string
  type: EntityType
  aliases: string[]
}

export const ENTITY_DICTIONARIES: DictionaryEntry[] = [
  { type: 'Country', canonical: 'United States', aliases: ['united states', 'usa', 'u.s.a.', 'u.s.', 'america'] },
  { type: 'Country', canonical: 'United Kingdom', aliases: ['united kingdom', 'uk', 'u.k.', 'britain', 'great britain'] },
  { type: 'Country', canonical: 'China', aliases: ['china', 'chinese'] },
  { type: 'Country', canonical: 'Russia', aliases: ['russia', 'russian'] },
  { type: 'Country', canonical: 'Germany', aliases: ['germany', 'german'] },
  { type: 'Country', canonical: 'France', aliases: ['france', 'french'] },
  { type: 'Country', canonical: 'Japan', aliases: ['japan', 'japanese'] },
  { type: 'Country', canonical: 'India', aliases: ['india', 'indian'] },
  { type: 'Country', canonical: 'Israel', aliases: ['israel', 'israeli'] },
  { type: 'Country', canonical: 'Ukraine', aliases: ['ukraine', 'ukrainian'] },
  { type: 'Country', canonical: 'Canada', aliases: ['canada', 'canadian'] },
  { type: 'Country', canonical: 'Australia', aliases: ['australia', 'australian'] },
  { type: 'City', canonical: 'New York', aliases: ['new york', 'new york city', 'nyc'] },
  { type: 'City', canonical: 'London', aliases: ['london'] },
  { type: 'City', canonical: 'San Francisco', aliases: ['san francisco', 'sf'] },
  { type: 'City', canonical: 'Washington', aliases: ['washington dc', 'washington d.c.', 'washington'] },
  { type: 'City', canonical: 'Tokyo', aliases: ['tokyo'] },
  { type: 'City', canonical: 'Berlin', aliases: ['berlin'] },
  { type: 'City', canonical: 'Paris', aliases: ['paris'] },
  { type: 'Company', canonical: 'Microsoft', aliases: ['microsoft'] },
  { type: 'Company', canonical: 'Google', aliases: ['google', 'alphabet'] },
  { type: 'Company', canonical: 'Apple', aliases: ['apple', 'apple inc'] },
  { type: 'Company', canonical: 'Amazon', aliases: ['amazon'] },
  { type: 'Company', canonical: 'Meta', aliases: ['meta', 'facebook'] },
  { type: 'Company', canonical: 'OpenAI', aliases: ['openai'] },
  { type: 'Company', canonical: 'Tesla', aliases: ['tesla'] },
  { type: 'Company', canonical: 'Nvidia', aliases: ['nvidia'] },
  { type: 'Company', canonical: 'Intel', aliases: ['intel'] },
  { type: 'Company', canonical: 'Samsung', aliases: ['samsung'] },
  { type: 'Organization', canonical: 'NATO', aliases: ['nato'] },
  { type: 'Organization', canonical: 'United Nations', aliases: ['united nations', 'un'] },
  { type: 'Organization', canonical: 'European Union', aliases: ['european union', 'eu'] },
  { type: 'Technology', canonical: 'Artificial Intelligence', aliases: ['artificial intelligence', 'ai'] },
  { type: 'Technology', canonical: 'Machine Learning', aliases: ['machine learning', 'ml'] },
  { type: 'Technology', canonical: 'Blockchain', aliases: ['blockchain'] },
  { type: 'Technology', canonical: 'Cloud Computing', aliases: ['cloud computing', 'cloud'] },
  { type: 'Technology', canonical: 'Cybersecurity', aliases: ['cybersecurity', 'cyber security'] },
  { type: 'Technology', canonical: 'Quantum Computing', aliases: ['quantum computing'] },
  { type: 'Programming Language', canonical: 'JavaScript', aliases: ['javascript', 'js'] },
  { type: 'Programming Language', canonical: 'TypeScript', aliases: ['typescript', 'ts'] },
  { type: 'Programming Language', canonical: 'Python', aliases: ['python'] },
  { type: 'Programming Language', canonical: 'Rust', aliases: ['rust'] },
  { type: 'Programming Language', canonical: 'Go', aliases: ['go', 'golang'] },
  { type: 'Programming Language', canonical: 'Java', aliases: ['java'] },
  { type: 'Programming Language', canonical: 'C++', aliases: ['c++', 'cpp'] },
  { type: 'Programming Language', canonical: 'C#', aliases: ['c#', 'csharp'] },
  { type: 'Programming Language', canonical: 'Ruby', aliases: ['ruby'] },
  { type: 'Programming Language', canonical: 'PHP', aliases: ['php'] },
  { type: 'Programming Language', canonical: 'Swift', aliases: ['swift'] },
  { type: 'Programming Language', canonical: 'Kotlin', aliases: ['kotlin'] },
  { type: 'Software', canonical: 'Linux', aliases: ['linux'] },
  { type: 'Software', canonical: 'Windows', aliases: ['windows'] },
  { type: 'Software', canonical: 'Docker', aliases: ['docker'] },
  { type: 'Software', canonical: 'Kubernetes', aliases: ['kubernetes', 'k8s'] },
  { type: 'Software', canonical: 'React', aliases: ['react', 'reactjs'] },
  { type: 'Software', canonical: 'Node.js', aliases: ['node.js', 'nodejs', 'node'] },
  { type: 'Software', canonical: 'PostgreSQL', aliases: ['postgresql', 'postgres'] },
  { type: 'Product', canonical: 'iPhone', aliases: ['iphone'] },
  { type: 'Product', canonical: 'ChatGPT', aliases: ['chatgpt'] },
  { type: 'Product', canonical: 'Windows Server', aliases: ['windows server'] },
  { type: 'Cryptocurrency', canonical: 'Bitcoin', aliases: ['bitcoin', 'btc'] },
  { type: 'Cryptocurrency', canonical: 'Ethereum', aliases: ['ethereum', 'eth'] },
  { type: 'Cryptocurrency', canonical: 'Solana', aliases: ['solana', 'sol'] },
  { type: 'Cryptocurrency', canonical: 'Dogecoin', aliases: ['dogecoin', 'doge'] },
  { type: 'Currency', canonical: 'US Dollar', aliases: ['usd', 'us dollar', 'dollar', 'dollars'] },
  { type: 'Currency', canonical: 'Euro', aliases: ['eur', 'euro', 'euros'] },
  { type: 'Currency', canonical: 'British Pound', aliases: ['gbp', 'british pound', 'pound'] },
  { type: 'Stock', canonical: 'AAPL', aliases: ['aapl'] },
  { type: 'Stock', canonical: 'MSFT', aliases: ['msft'] },
  { type: 'Stock', canonical: 'GOOGL', aliases: ['googl', 'goog'] },
  { type: 'Stock', canonical: 'TSLA', aliases: ['tsla'] },
  { type: 'Stock', canonical: 'NVDA', aliases: ['nvda'] },
]

export const DICTIONARY_LOOKUP = new Map<string, DictionaryEntry>()

for (const entry of ENTITY_DICTIONARIES) {
  for (const alias of entry.aliases) {
    DICTIONARY_LOOKUP.set(alias.toLowerCase(), entry)
  }
  DICTIONARY_LOOKUP.set(entry.canonical.toLowerCase(), entry)
}
