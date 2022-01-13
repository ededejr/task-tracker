import Package from '..';

describe('Package', () => {
	test('Package runs', () => {
		expect(Package('a')).toBe('a');
	});
});