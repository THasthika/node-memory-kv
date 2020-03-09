import { IMemCache } from "./IMemCache";
import { match } from 'micromatch';

export class MemCache implements IMemCache {

  data: {[key: string]: string} = {}
  ttls: {key: string, ttl: number}[] = []
  timeout: {handler?: NodeJS.Timeout, time?: number} = {
    handler: undefined,
    time: undefined
  }

  async set(key: string, value: string, ttl?: number | undefined): Promise<boolean> {
    this.removeKey(key)
    this.data[key] = value
    if (!!ttl) {
      this.addTTL(key, ttl)
    }
    return true
  }

  async get(key: string): Promise<string | null> {
    if (key in this.data) {
      return this.data[key]
    }
    return null
  }

  async keys(pattern: string): Promise<string[]> {
    let keys = match(Object.keys(this.data), pattern)
    return keys
  }

  async del(...keys: string[]): Promise<boolean> {
    keys.forEach(key => {
      this.removeKey(key)
    });
    return true
  }

  async ttl(key: string): Promise<number> {
    if (!(key in this.data)) {
      return -1
    }
    for (let i = 0; i < this.ttls.length; i++) {
      if (this.ttls[i].key == key) {
        return Math.round((this.ttls[i].ttl - Date.now()) / 1000)
      }
    }
    return -1
  }

  async incr(key: string): Promise<number> {
    if (!(key in this.data)) {
      return -1
    }
    let v = this.data[key]
    let n = parseInt(v)
    if (n == NaN) {
      return -1
    }
    n += 1
    this.data[key] = String(n)
    return n
  }


  private addTTL(key: string, ttl: number) {
    let nextTime = Date.now() + ttl * 1000
    if (!this.timeout.time || nextTime < this.timeout.time!!) {
      if (!!this.timeout.handler) {
        clearTimeout(this.timeout.handler!!)
      }
      this.timeout.handler = setTimeout(this.timeoutHandler(this), nextTime - Date.now())
      this.timeout.time = nextTime
    }
    this.ttls.push({
      key: key,
      ttl: nextTime
    })
    this.ttls.sort((a, b) => {
      return b.ttl - a.ttl
    })
  }

  private removeKey(key: string) {
    delete this.data[key]
    for(let i = 0; i < this.ttls.length; i++) {
      if (this.ttls[i].key == key) {
        this.ttls.splice(i, 1)
        return
      }
    }
  }

  private timeoutHandler(that: MemCache) {
    return function() {
      let ttl: {key: string, ttl: number} | undefined;
      if (that.ttls.length == 0) return
      do {
        ttl = that.ttls.shift()
        if (!ttl) {
          that.timeout.handler = undefined
          that.timeout.time = undefined
          break
        }
        let nowTime = Date.now()
        let dt = ttl.ttl - nowTime
        if (dt > 0) {
          that.timeout.handler = setTimeout(that.timeoutHandler(that), dt)
          that.timeout.time = ttl.ttl
          that.ttls.unshift(ttl)
          break
        }
        delete that.data[ttl.key]
      } while (ttl != undefined)
    }
  }
}