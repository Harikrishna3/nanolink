const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const BASE = ALPHABET.length;

export function encodeBase62(num: number): string {
  if (num === 0) {
    return ALPHABET[0];
  }

  let str = '';
  while (num > 0) {
    const remainder = num % BASE;
    str = ALPHABET[remainder] + str;
    num = Math.floor(num / BASE);
  }

  return str;
}
