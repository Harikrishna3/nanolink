const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const BASE = BigInt(ALPHABET.length);

export function encodeBase62(input: string | number | bigint): string {
  // If input is a raw hex string from a hash without '0x', add it so BigInt parses it correctly
  let numStr = input.toString();
//   if (/^[0-9a-fA-F]+$/.test(numStr) && !/^\d+$/.test(numStr) && !numStr.startsWith('0x')) {
//     numStr = `0x${numStr}`;
//   }
  
  let num = BigInt(numStr);

  if (num === 0n) {
    return ALPHABET[0];
  }

  let str = '';
  while (num > 0n) {
    const remainder = Number(num % BASE);
    str = ALPHABET[remainder] + str;
    num = num / BASE;
  }

  return str;
}
