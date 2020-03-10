import MemoryKV from '..';

test('Should create a store', async () => {
  const cache = new MemoryKV();
  expect(cache).toBeDefined();
  await cache.set('xx', 'xx');
  expect(await cache.get('xx')).toBe('xx');
});
