/**
 * Evaluates a calculator expression such as "720 + 173" or "(2+3)×4%".
 * Hermes has no eval/Function, so this is a small recursive-descent parser.
 * Returns null when the expression is incomplete or invalid.
 */
export function evaluate(expr: string): number | null {
  const src = expr.replace(/\s/g, '');
  let i = 0;

  const peek = () => src[i];
  const take = () => src[i++];

  function primary(): number | null {
    if (peek() === '(') {
      take();
      const v = sum();
      if (peek() === ')') take();
      return v;
    }
    if (peek() === '−' || peek() === '-') {
      take();
      const v = postfix();
      return v == null ? null : -v;
    }
    const m = /^\d*\.?\d+|^\d+\.?/.exec(src.slice(i));
    if (!m) return null;
    i += m[0].length;
    return parseFloat(m[0]);
  }

  function postfix(): number | null {
    let v = primary();
    while (v != null && peek() === '%') {
      take();
      v /= 100;
    }
    return v;
  }

  function product(): number | null {
    let v = postfix();
    while (v != null && (peek() === '×' || peek() === '÷')) {
      const op = take();
      const r = postfix();
      if (r == null) return null;
      v = op === '×' ? v * r : v / r;
    }
    return v;
  }

  function sum(): number | null {
    let v = product();
    while (v != null && (peek() === '+' || peek() === '−' || peek() === '-')) {
      const op = take();
      const r = product();
      if (r == null) return null;
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }

  const v = sum();
  if (v == null || i !== src.length) return null;
  return v;
}

export function formatResult(v: number): string {
  if (!Number.isFinite(v)) return 'Error';
  return String(Math.round(v * 1e8) / 1e8);
}
