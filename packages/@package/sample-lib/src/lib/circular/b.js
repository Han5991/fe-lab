import { getC } from './c.js';

export const nameB = 'Module B';

export function getB() {
    return `I am ${nameB}, and I know: ${getC()}`;
}
