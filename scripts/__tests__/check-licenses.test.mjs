import { isAllowed, failures } from '../check-licenses.mjs';

test('allows a listed license', () => {
  expect(isAllowed('MIT')).toBe(true);
});

test('allows an SPDX OR expression when any one choice is listed', () => {
  expect(isAllowed('(MIT OR Apache-2.0)')).toBe(true);
  expect(isAllowed('(BSD-3-Clause OR GPL-2.0)')).toBe(true);
});

test('allows the GPL-compatible licenses Expo build tools use', () => {
  expect(isAllowed('CC-BY-4.0')).toBe(true);
  expect(isAllowed('MPL-2.0')).toBe(true);
});

test('rejects an unlisted license and an OR with no listed choice', () => {
  expect(isAllowed('SSPL-1.0')).toBe(false);
  expect(isAllowed('(SSPL-1.0 OR Commercial)')).toBe(false);
});

test('lists each failing package as name@version: license', () => {
  const report = {
    'ok@1.0.0': { licenses: 'MIT' },
    'bad@2.0.0': { licenses: 'SSPL-1.0' },
    'many@3.0.0': { licenses: ['MIT', 'Commercial'] },
  };
  expect(failures(report)).toEqual(['bad@2.0.0: SSPL-1.0', 'many@3.0.0: MIT, Commercial']);
});
