import { useEffect, useRef, useState, type ReactNode } from 'react';
import { History, EllipsisVertical, Delete } from 'lucide-react';
import { useI18n } from '../i18n';
import type { Mode } from '../types';

/** Demo unlock code. In the real app this is chosen by her and stored hashed. */
export const UNLOCK_CODE = '1947';

type Op = '+' | '−' | '×' | '÷';
const OPS: Op[] = ['+', '−', '×', '÷'];
const isOp = (s: string | undefined): s is Op => !!s && (OPS as string[]).includes(s);

/** Evaluate number/operator tokens with normal precedence. No eval(). */
function evaluate(tokens: string[]): number {
  const t = [...tokens];
  if (isOp(t[t.length - 1])) t.pop();
  if (t.length === 0) return 0;
  // pass 1: × ÷
  const stack: (number | Op)[] = [parseFloat(t[0])];
  for (let i = 1; i < t.length; i += 2) {
    const op = t[i] as Op;
    const n = parseFloat(t[i + 1]);
    if (op === '×' || op === '÷') {
      const prev = stack.pop() as number;
      if (op === '÷' && n === 0) return NaN;
      stack.push(op === '×' ? prev * n : prev / n);
    } else {
      stack.push(op, n);
    }
  }
  // pass 2: + −
  let acc = stack[0] as number;
  for (let i = 1; i < stack.length; i += 2) {
    const op = stack[i] as Op;
    const n = stack[i + 1] as number;
    acc = op === '+' ? acc + n : acc - n;
  }
  return acc;
}

function format(n: number): string {
  if (!isFinite(n)) return 'NaN';
  const s = parseFloat(n.toPrecision(10)).toString();
  return s;
}

type State = { tokens: string[]; done: { expr: string; result: string } | null };

type Props = { mode: Mode; onUnlock: () => void; startDemo?: boolean };

export function Calculator({ mode, onUnlock, startDemo = false }: Props) {
  const { t } = useI18n();
  const k = t.calc.keys;
  const pressRef = useRef<(key: string) => void>(() => {});
  // The pitch frame shows the designed state "893 =" / "893".
  const [s, setS] = useState<State>(
    startDemo ? { tokens: [], done: { expr: '893', result: '893' } } : { tokens: [], done: null },
  );
  const sRef = useRef(s);
  sRef.current = s;

  const press = (key: string) => {
    const next = reduce(sRef.current, key);
    if (next === 'unlock') {
      setS({ tokens: [], done: null });
      onUnlock();
      return;
    }
    sRef.current = next;
    setS(next);
  };
  pressRef.current = press;

  function reduce(prev: State, key: string): State | 'unlock' {
    {
      let tokens = [...prev.tokens];
      const done = prev.done;
      const last = tokens[tokens.length - 1];

      if (key === 'AC') return { tokens: [], done: null };

      if (/^\d$/.test(key)) {
        if (done) return { tokens: [key], done: null };
        if (last !== undefined && !isOp(last)) {
          tokens[tokens.length - 1] = last === '0' ? key : last === '-0' ? `-${key}` : last + key;
        } else tokens.push(key);
        return { tokens, done: null };
      }

      if (key === '.') {
        if (done) return { tokens: ['0.'], done: null };
        if (last !== undefined && !isOp(last)) {
          if (!last.includes('.')) tokens[tokens.length - 1] = last + '.';
        } else tokens.push('0.');
        return { tokens, done: null };
      }

      if (isOp(key)) {
        if (done) {
          const start = done.result === 'NaN' ? '0' : done.result;
          return { tokens: [start, key], done: null };
        }
        if (tokens.length === 0) tokens = ['0'];
        if (isOp(tokens[tokens.length - 1])) tokens[tokens.length - 1] = key;
        else tokens.push(key);
        return { tokens, done: null };
      }

      if (key === 'DEL') {
        if (done) return { tokens: [], done: null };
        if (last === undefined) return prev;
        if (isOp(last) || last.length <= 1 || (last.startsWith('-') && last.length <= 2)) tokens.pop();
        else tokens[tokens.length - 1] = last.slice(0, -1);
        return { tokens, done: null };
      }

      if (key === '±' || key === '%') {
        if (done && done.result !== 'NaN') tokens = [done.result];
        const l = tokens[tokens.length - 1];
        if (l === undefined || isOp(l)) return prev;
        tokens[tokens.length - 1] =
          key === '±' ? (l.startsWith('-') ? l.slice(1) : `-${l}`) : format(parseFloat(l) / 100);
        return { tokens, done: null };
      }

      if (key === '=') {
        if (tokens.length === 0) return prev;
        const expr = tokens.join('');
        // Unlock silently; leave nothing behind on the display.
        if (expr === UNLOCK_CODE) return 'unlock';
        const clean = isOp(last) ? tokens.slice(0, -1) : tokens;
        return { tokens: [], done: { expr: clean.join(' '), result: format(evaluate(clean)) } };
      }
      return prev;
    }
  }

  // Physical keyboard support in the live demo.
  useEffect(() => {
    if (mode !== 'live') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && target.closest('input, textarea, select')) return;
      const map: Record<string, string> = {
        '+': '+', '-': '−', '*': '×', x: '×', '/': '÷', Enter: '=', '=': '=',
        Backspace: 'DEL', Delete: 'AC', '.': '.', '%': '%',
      };
      const key = /^\d$/.test(e.key) ? e.key : map[e.key];
      if (!key) return;
      if (e.key === 'Enter' && target?.tagName === 'BUTTON') return; // let Enter activate the focused key
      e.preventDefault();
      pressRef.current(key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode]);

  const live = s.tokens.join(' ');
  const topLine = s.done ? `${s.done.expr} =` : live && s.tokens.length > 1 ? format(evaluate(s.tokens)) : '';
  const mainRaw = s.done ? s.done.result : live || '0';
  const main = mainRaw === 'NaN' ? t.calc.error : mainRaw;
  const mainSize = main.length > 12 ? 'sm' : main.length > 8 ? 'md' : 'lg';

  const keys: { key: string; label: ReactNode; aria?: string; kind: 'fn' | 'num' | 'op' | 'eq' }[] = [
    { key: 'AC', label: 'AC', aria: k.clear, kind: 'fn' },
    { key: '±', label: '±', aria: k.sign, kind: 'fn' },
    { key: '%', label: '%', aria: k.percent, kind: 'fn' },
    { key: '÷', label: '÷', aria: k.divide, kind: 'op' },
    { key: '7', label: '7', kind: 'num' },
    { key: '8', label: '8', kind: 'num' },
    { key: '9', label: '9', kind: 'num' },
    { key: '×', label: '×', aria: k.multiply, kind: 'op' },
    { key: '4', label: '4', kind: 'num' },
    { key: '5', label: '5', kind: 'num' },
    { key: '6', label: '6', kind: 'num' },
    { key: '−', label: '−', aria: k.minus, kind: 'op' },
    { key: '1', label: '1', kind: 'num' },
    { key: '2', label: '2', kind: 'num' },
    { key: '3', label: '3', kind: 'num' },
    { key: '+', label: '+', aria: k.plus, kind: 'op' },
    { key: '0', label: '0', kind: 'num' },
    { key: '.', label: '.', aria: k.point, kind: 'num' },
    { key: 'DEL', label: <Delete size={22} aria-hidden="true" />, aria: k.del, kind: 'num' },
    { key: '=', label: '=', aria: k.equals, kind: 'eq' },
  ];

  return (
    <div className="calc">
      <div className="calc__bar">
        <button type="button" className="calc__icon" aria-label={t.calc.history}>
          <History size={20} aria-hidden="true" />
        </button>
        <h1 className="calc__title" tabIndex={-1}>
          {t.calc.title}
        </h1>
        <button type="button" className="calc__icon" aria-label={t.calc.more}>
          <EllipsisVertical size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="calc__display">
        <div className="calc__expr" aria-hidden="true">
          {topLine}
        </div>
        <output className={`calc__main calc__main--${mainSize}`} aria-live="polite" aria-label={t.calc.result}>
          {main}
        </output>
      </div>

      <div className="calc__keys" role="group" aria-label={t.calc.keypad}>
        {keys.map((key) => (
          <button
            key={key.key}
            type="button"
            className={`calc__key calc__key--${key.kind}`}
            aria-label={key.aria}
            onClick={() => press(key.key)}
          >
            {key.label}
          </button>
        ))}
      </div>
    </div>
  );
}
