// Here is the circular dependency! C imports from A.
import { nameA } from './a.js';

export const nameC = 'Module C';

export function getC() {
    // We use nameA (which is a primitive) - notice how CJS resolves it.
    return `I am ${nameC}, and I loop back to: ${nameA}`;
}
