/* eslint-disable no-undef */
module.exports = {
	moduleFileExtensions: ['ts', 'js', 'json', 'node'],
	preset: 'ts-jest',
	roots: ['<rootDir>/src'],
	testRegex: '(/tests/.*|(\\.|/)(test))\\.ts$',
	transform: {
		'^.+\\.ts$': 'ts-jest',
	},
};