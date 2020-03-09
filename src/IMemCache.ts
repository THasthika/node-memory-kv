export interface IMemCache {
  set(key: string, value: string, ttl?: number): Promise<boolean>
  get(key: string): Promise<string | null>
  keys(pattern: string): Promise<string[]>
  del(...keys: string[]): Promise<boolean>
  ttl(key: string): Promise<number>
  incr(key: string): Promise<number>
}
