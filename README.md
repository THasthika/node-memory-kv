# MemoryKV

An in memory key value store. Tries to emulate Redis inside node itself.

Mainly useful for development purposes.


```ts
const cache = new MemCache();
await cache.set('key1', 'value')

const val = await cache.get('key1')
// val == 'value'
```

# Features

- [x] Setup a TTL feature
- [x] Set a value with a key
- [x] Get a value with a key
- [x] Delete a value with a key
- [x] Get list of keys provided a pattern

## TTL Strategy

- timeout holder is set to the next execution of the executor with the time it will run
- when a new entry with a ttl is added check if that time is sooner than the timeout, if so cancel the timeout holder and set a new one