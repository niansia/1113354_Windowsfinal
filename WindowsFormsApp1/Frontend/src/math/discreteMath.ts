const requireInteger = (value: number, nonNegative = false): number => {
  if (!Number.isSafeInteger(value) || (nonNegative && value < 0)) throw new Error('INTEGER_REQUIRED');
  return value;
};

export const gcd = (left: number, right: number): number => {
  let a = Math.abs(requireInteger(left));
  let b = Math.abs(requireInteger(right));
  while (b !== 0) [a, b] = [b, a % b];
  return a;
};

export const lcm = (left: number, right: number): number => {
  const a = requireInteger(left);
  const b = requireInteger(right);
  if (a === 0 || b === 0) return 0;
  return Math.abs((a / gcd(a, b)) * b);
};

export const permutations = (n: number, r: number): number => {
  requireInteger(n, true);
  requireInteger(r, true);
  if (r > n) throw new Error('INVALID_RANGE');
  let result = 1;
  for (let index = 0; index < r; index += 1) result *= n - index;
  if (!Number.isSafeInteger(result)) throw new Error('RESULT_TOO_LARGE');
  return result;
};

export const combinations = (n: number, r: number): number => {
  requireInteger(n, true);
  requireInteger(r, true);
  if (r > n) throw new Error('INVALID_RANGE');
  const count = Math.min(r, n - r);
  let result = 1;
  for (let index = 1; index <= count; index += 1) {
    result = result * (n - count + index) / index;
  }
  if (!Number.isSafeInteger(result)) throw new Error('RESULT_TOO_LARGE');
  return result;
};

export const isPrime = (value: number): boolean => {
  const n = requireInteger(value, true);
  if (n < 2) return false;
  if (n % 2 === 0) return n === 2;
  for (let divisor = 3; divisor * divisor <= n; divisor += 2) {
    if (n % divisor === 0) return false;
  }
  return true;
};

export const primeFactorization = (value: number): number[] => {
  let n = Math.abs(requireInteger(value));
  if (n < 2) return [];
  const factors: number[] = [];
  while (n % 2 === 0) {
    factors.push(2);
    n /= 2;
  }
  for (let divisor = 3; divisor * divisor <= n; divisor += 2) {
    while (n % divisor === 0) {
      factors.push(divisor);
      n /= divisor;
    }
  }
  if (n > 1) factors.push(n);
  return factors;
};

export const modPow = (base: number, exponent: number, modulus: number): number => {
  requireInteger(base);
  requireInteger(exponent, true);
  requireInteger(modulus);
  if (modulus <= 0) throw new Error('INVALID_MODULUS');
  let result = 1n;
  let current = BigInt(((base % modulus) + modulus) % modulus);
  let power = BigInt(exponent);
  const mod = BigInt(modulus);
  while (power > 0n) {
    if (power & 1n) result = result * current % mod;
    current = current * current % mod;
    power >>= 1n;
  }
  return Number(result);
};

export const convertIntegerBase = (value: string, fromBase: number, toBase: number): string => {
  if (!Number.isInteger(fromBase) || !Number.isInteger(toBase) || fromBase < 2 || fromBase > 36 || toBase < 2 || toBase > 36) {
    throw new Error('INVALID_BASE');
  }
  const source = value.trim().toLowerCase();
  if (!source) throw new Error('EMPTY_VALUE');
  const negative = source.startsWith('-');
  const digits = negative ? source.slice(1) : source;
  let result = 0n;
  for (const digit of digits) {
    const parsed = Number.parseInt(digit, 36);
    if (!Number.isInteger(parsed) || parsed >= fromBase) throw new Error('INVALID_DIGIT');
    result = result * BigInt(fromBase) + BigInt(parsed);
  }
  if (negative) result *= -1n;
  return result.toString(toBase).toUpperCase();
};
