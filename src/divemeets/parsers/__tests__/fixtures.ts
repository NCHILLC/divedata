import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..', '..', '..', '..', 'fixtures', 'divemeets');

/** Reads a saved DiveMeets page, e.g. `fixture('meet-list/past.html')`. */
export function fixture(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}
