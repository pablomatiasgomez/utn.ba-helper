import {
	LoggedOutError,
	RedirectedToHomeError,
	GuaraniBackendError,
	MissingStudentIdError,
	isIgnoredError,
	stringifyError
} from './Errors.js';

describe('isIgnoredError', () => {
	it('should return true for LoggedOutError', () => {
		const error = new LoggedOutError();
		expect(isIgnoredError(error)).toBe(true);
	});

	it('should return true for GuaraniBackendError', () => {
		const error = new GuaraniBackendError('Backend error');
		expect(isIgnoredError(error)).toBe(true);
	});

	it('should return true for MissingStudentIdError', () => {
		const error = new MissingStudentIdError('No student ID');
		expect(isIgnoredError(error)).toBe(true);
	});

	it('should return false for RedirectedToHomeError', () => {
		const error = new RedirectedToHomeError();
		expect(isIgnoredError(error)).toBe(false);
	});

	it('should return false for generic Error', () => {
		const error = new Error('Generic error');
		expect(isIgnoredError(error)).toBe(false);
	});

	it('should return false for null', () => {
		expect(isIgnoredError(null)).toBe(false);
	});

	it('should return false for undefined', () => {
		expect(isIgnoredError(undefined)).toBe(false);
	});

	it('should return true if cause is an ignored error', () => {
		const cause = new LoggedOutError();
		const error = new Error('Wrapper error', {cause});
		expect(isIgnoredError(error)).toBe(true);
	});

	it('should return true if cause of cause is an ignored error', () => {
		const rootCause = new GuaraniBackendError('Root cause');
		const cause = new Error('Middle error', {cause: rootCause});
		const error = new Error('Top error', {cause});
		expect(isIgnoredError(error)).toBe(true);
	});

	it('should return false if no error in cause chain is ignored', () => {
		const rootCause = new RedirectedToHomeError();
		const cause = new Error('Middle error', {cause: rootCause});
		const error = new Error('Top error', {cause});
		expect(isIgnoredError(error)).toBe(false);
	});

	it('should handle deeply nested cause chains', () => {
		const level4 = new MissingStudentIdError('Deep error');
		const level3 = new Error('Level 3', {cause: level4});
		const level2 = new Error('Level 2', {cause: level3});
		const level1 = new Error('Level 1', {cause: level2});
		const level0 = new Error('Level 0', {cause: level1});
		expect(isIgnoredError(level0)).toBe(true);
	});
});

describe('stringifyError', () => {
	it('should stringify Error with stack', () => {
		const error = new Error('Test error');
		const result = stringifyError(error);
		expect(result).toContain('Test error');
		expect(result).toContain('Error: Test error');
	});

	it('should stringify custom error classes', () => {
		const error = new LoggedOutError('User logged out');
		const result = stringifyError(error);
		expect(result).toContain('LoggedOutError');
		expect(result).toContain('User logged out');
	});

	it('should include cause in stringification', () => {
		const cause = new Error('Original error');
		const error = new Error('Wrapper error', {cause});
		const result = stringifyError(error);
		expect(result).toContain('Wrapper error');
		expect(result).toContain('Caused by:');
		expect(result).toContain('Original error');
	});

	it('should include nested causes in stringification', () => {
		const rootCause = new Error('Root cause');
		const middleCause = new Error('Middle error', {cause: rootCause});
		const error = new Error('Top error', {cause: middleCause});
		const result = stringifyError(error);
		expect(result).toContain('Top error');
		expect(result).toContain('Caused by:');
		expect(result).toContain('Middle error');
		expect(result).toContain('Root cause');
	});

	it('should stringify plain objects', () => {
		const obj = {foo: 'bar', baz: 123};
		const result = stringifyError(obj);
		expect(result).toBe(JSON.stringify(obj));
	});

	it('should stringify primitive values', () => {
		expect(stringifyError('string error')).toBe('string error');
		expect(stringifyError(123)).toBe('123');
		expect(stringifyError(true)).toBe('true');
	});

	it('should handle null and undefined', () => {
		expect(stringifyError(null)).toBe('null');
		expect(stringifyError(undefined)).toBe('undefined');
	});

	it('should handle errors without stack property', () => {
		const error = new Error('Test');
		delete error.stack;
		const result = stringifyError(error);
		expect(result).toContain('Test');
	});
});
