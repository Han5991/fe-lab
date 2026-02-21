import { getB } from './b.js';

export const nameA = 'Module A';

export function getA() {
    return `I am ${nameA}, and I know: ${getB()}`;
}
