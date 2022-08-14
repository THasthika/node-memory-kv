import { match } from 'micromatch';

interface IMemoryKV {
  set: (key: string, value: string, ttl?: number) => Promise<boolean>;
  get: (key: string) => Promise<string | null>;
  keys: (pattern: string) => Promise<string[]>;
  del: (...keys: string[]) => Promise<boolean>;
  ttl: (key: string) => Promise<number>;
  incr: (key: string) => Promise<number>;
}

export default class MemoryKV implements IMemoryKV {
  private data: { [key: string]: string } = {};
  private readonly ttls: Array<{ key: string; ttl: number }> = [];
  private timeout: { handler?: NodeJS.Timeout; time?: number } = {
    handler: undefined,
    time: undefined,
  };

  public async set(key: string, value: string, ttl?: number | undefined): Promise<boolean> {
    this.removeKey(key);
    this.data[key] = value;
    if (ttl != null) {
      this.addTTL(key, ttl);
    }
    return true;
  }

  public async get(key: string): Promise<string | null> {
    if (key in this.data) {
      return this.data[key];
    }
    return null;
  }

  public async keys(pattern: string): Promise<string[]> {
    const keys = match(Object.keys(this.data), pattern);
    return keys;
  }

  public async del(...keys: string[]): Promise<boolean> {
    keys.forEach((key) => {
      this.removeKey(key);
    });
    return true;
  }

  public async ttl(key: string): Promise<number> {
    if (!(key in this.data)) {
      return -1;
    }
    for (const ttl of this.ttls) {
      if (ttl.key === key) {
        return Math.round((ttl.ttl - Date.now()) / 1000);
      }
    }
    return -1;
  }

  public async incr(key: string): Promise<number> {
    if (!(key in this.data)) {
      return -1;
    }
    const v = this.data[key];
    let n = parseInt(v, 10);
    if (isNaN(n)) {
      return -1;
    }
    n += 1;
    this.data[key] = String(n);
    return n;
  }

  private addTTL(key: string, ttl: number): void {
    const nextTime = Date.now() + ttl * 1000;
    if (this.timeout.time == null || nextTime < this.timeout.time) {
      if (this.timeout.handler != null) {
        clearTimeout(this.timeout.handler);
      }
      this.timeout.handler = setTimeout(this.timeoutHandler(this), nextTime - Date.now());
      this.timeout.time = nextTime;
    }
    this.ttls.push({
      key,
      ttl: nextTime,
    });
    this.ttls.sort((a, b) => {
      return b.ttl - a.ttl;
    });
  }

  private removeKey(key: string): void {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.data[key];
    for (let i = 0; i < this.ttls.length; i++) {
      if (this.ttls[i].key === key) {
        this.ttls.splice(i, 1);
        return;
      }
    }
  }

  private timeoutHandler(that: MemoryKV) {
    return () => {
      let ttl: { key: string; ttl: number } | undefined;
      if (that.ttls.length === 0) {
        return;
      }
      do {
        ttl = that.ttls.shift();
        if (ttl == null) {
          that.timeout.handler = undefined;
          that.timeout.time = undefined;
          break;
        }
        const nowTime = Date.now();
        const dt = ttl.ttl - nowTime;
        if (dt > 0) {
          that.timeout.handler = setTimeout(that.timeoutHandler(that), dt);
          that.timeout.time = ttl.ttl;
          that.ttls.unshift(ttl);
          break;
        }
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete that.data[ttl.key];
      } while (ttl !== undefined);
    };
  }
}
