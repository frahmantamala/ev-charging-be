// jest global setup for tests
// Mock ioredis so tests don't open real redis connections and leave handles open.

// jest is available in this environment
jest.mock('ioredis', () => {
	const FakeRedis = function() {
		return {
			get: async (_: string) => null,
			set: async (_: string, _v: any) => 'OK',
			del: async (_: string) => 1,
			quit: async () => 'OK',
		};
	} as any;
	FakeRedis.default = FakeRedis;
	return FakeRedis;
});
