import { customAlphabet } from 'nanoid';

// Use URL-safe characters excluding similar looking ones (0, O, I, l)
const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export const generateLinkId = customAlphabet(alphabet, 8);