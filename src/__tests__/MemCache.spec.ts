import { MemCache } from '../MemCache';

test('Should create a store', async () => {
    const cache = new MemCache();
    expect(cache).toBeDefined();
    await cache.set('xx', 'xx')
    expect(await cache.get('xx')).toBe('xx')
});