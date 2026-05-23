export function add(left: number, right: number): number {
  return left + right;
}

export function multiply(left: number, right: number): number {
  return left * right;
}

export class Calculator {
  total(values: number[]): number {
    return values.reduce((sum, value) => add(sum, value), 0);
  }
}
