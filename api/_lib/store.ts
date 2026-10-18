import { config } from './config.ts';
import type { BaitRecord, EventRecord } from './model.ts';

/**
 * Storage abstraction. A Bait Test needs a server-side record of each test, its hashed token,
 * and the events observed for it. Two backends implement the same interface:
 *  - KvStore:     Vercel KV / Upstash Redis over REST (durable; used in production).
 *  - MemoryStore: in-process Map (used for local runs and tests; NOT durable across invocations).
 */
export interface Store {
  putBait(b: BaitRecord): Promise<void>;
  getBait(id: string): Promise<BaitRecord | null>;
  setProviderId(baitId: string, providerId: string): Promise<void>;
  baitIdByToken(tokenHash: string): Promise<string | null>;
  baitIdByProvider(providerId: string): Promise<string | null>;
  deleteBait(id: string): Promise<void>;
  addEvent(e: EventRecord): Promise<void>;
  listEvents(baitId: string): Promise<EventRecord[]>;
  /** Returns true the first time a dedup key is seen, false on repeats (webhook idempotency). */
  markSeen(key: string): Promise<boolean>;
  /** Fixed-window counter. Returns the count after incrementing. */
  bump(key: string, windowSec: number): Promise<number>;
}

const ttlSec = () => Math.max(config.retentionDays, config.tokenTtlDays) * 24 * 60 * 60;

/* ------------------------------ in-memory ------------------------------ */

type Expiring<T> = { v: T; exp: number };

class MemoryStore implements Store {
  private baits = new Map<string, Expiring<BaitRecord>>();
  private byToken = new Map<string, Expiring<string>>();
  private byProvider = new Map<string, Expiring<string>>();
  private events = new Map<string, Expiring<EventRecord[]>>();
  private seen = new Map<string, number>();
  private counters = new Map<string, Expiring<number>>();

  private alive<T>(m: Map<string, Expiring<T>>, k: string): T | null {
    const e = m.get(k);
    if (!e) return null;
    if (e.exp < Date.now()) {
      m.delete(k);
      return null;
    }
    return e.v;
  }

  async putBait(b: BaitRecord) {
    const exp = Date.now() + ttlSec() * 1000;
    this.baits.set(b.id, { v: b, exp });
    this.byToken.set(b.tokenHash, { v: b.id, exp });
  }
  async getBait(id: string) {
    return this.alive(this.baits, id);
  }
  async setProviderId(baitId: string, providerId: string) {
    const b = await this.getBait(baitId);
    if (!b) return;
    b.providerId = providerId;
    await this.putBait(b);
    this.byProvider.set(providerId, { v: baitId, exp: Date.now() + ttlSec() * 1000 });
  }
  async baitIdByToken(tokenHash: string) {
    return this.alive(this.byToken, tokenHash);
  }
  async baitIdByProvider(providerId: string) {
    return this.alive(this.byProvider, providerId);
  }
  async deleteBait(id: string) {
    const b = this.baits.get(id)?.v;
    this.baits.delete(id);
    this.events.delete(id);
    if (b) {
      this.byToken.delete(b.tokenHash);
      if (b.providerId) this.byProvider.delete(b.providerId);
    }
  }
  async addEvent(e: EventRecord) {
    const cur = this.alive(this.events, e.baitId) ?? [];
    cur.push(e);
    this.events.set(e.baitId, { v: cur, exp: Date.now() + ttlSec() * 1000 });
  }
  async listEvents(baitId: string) {
    return this.alive(this.events, baitId) ?? [];
  }
  async markSeen(key: string) {
    if (this.seen.has(key)) return false;
    this.seen.set(key, Date.now());
    return true;
  }
  async bump(key: string, windowSec: number) {
    const now = Date.now();
    const cur = this.alive(this.counters, key);
    const next = (cur ?? 0) + 1;
    this.counters.set(key, { v: next, exp: cur != null ? this.counters.get(key)!.exp : now + windowSec * 1000 });
    return next;
  }
}

/* ------------------------------ Vercel KV ------------------------------ */

class KvStore implements Store {
  private async cmd<T = unknown>(args: (string | number)[]): Promise<T> {
    const res = await fetch(config.kvUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.kvToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
    if (!res.ok) throw new Error(`KV ${args[0]} failed: ${res.status}`);
    const json = (await res.json()) as { result: T };
    return json.result;
  }

  async putBait(b: BaitRecord) {
    const ex = ttlSec();
    await this.cmd(['SET', `bait:${b.id}`, JSON.stringify(b), 'EX', ex]);
    await this.cmd(['SET', `tok:${b.tokenHash}`, b.id, 'EX', ex]);
  }
  async getBait(id: string) {
    const v = await this.cmd<string | null>(['GET', `bait:${id}`]);
    return v ? (JSON.parse(v) as BaitRecord) : null;
  }
  async setProviderId(baitId: string, providerId: string) {
    const b = await this.getBait(baitId);
    if (!b) return;
    b.providerId = providerId;
    await this.cmd(['SET', `bait:${baitId}`, JSON.stringify(b), 'EX', ttlSec()]);
    await this.cmd(['SET', `prov:${providerId}`, baitId, 'EX', ttlSec()]);
  }
  async baitIdByToken(tokenHash: string) {
    return this.cmd<string | null>(['GET', `tok:${tokenHash}`]);
  }
  async baitIdByProvider(providerId: string) {
    return this.cmd<string | null>(['GET', `prov:${providerId}`]);
  }
  async deleteBait(id: string) {
    const b = await this.getBait(id);
    await this.cmd(['DEL', `bait:${id}`]);
    await this.cmd(['DEL', `ev:${id}`]);
    if (b) {
      await this.cmd(['DEL', `tok:${b.tokenHash}`]);
      if (b.providerId) await this.cmd(['DEL', `prov:${b.providerId}`]);
    }
  }
  async addEvent(e: EventRecord) {
    await this.cmd(['RPUSH', `ev:${e.baitId}`, JSON.stringify(e)]);
    await this.cmd(['EXPIRE', `ev:${e.baitId}`, ttlSec()]);
  }
  async listEvents(baitId: string) {
    const list = await this.cmd<string[]>(['LRANGE', `ev:${baitId}`, 0, -1]);
    return (list ?? []).map((s) => JSON.parse(s) as EventRecord);
  }
  async markSeen(key: string) {
    // SET NX with TTL: succeeds only the first time.
    const r = await this.cmd<string | null>(['SET', `seen:${key}`, '1', 'NX', 'EX', ttlSec()]);
    return r === 'OK';
  }
  async bump(key: string, windowSec: number) {
    const n = await this.cmd<number>(['INCR', `rl:${key}`]);
    if (n === 1) await this.cmd(['EXPIRE', `rl:${key}`, windowSec]);
    return n;
  }
}

let memo: MemoryStore | null = null;
export function getStore(): Store {
  if (config.kvUrl && config.kvToken) return new KvStore();
  if (!memo) memo = new MemoryStore();
  return memo;
}

export const storeIsDurable = () => !!(config.kvUrl && config.kvToken);

/** Exposed for tests so each case starts from a clean in-memory store. */
export function _newMemoryStore(): Store {
  return new MemoryStore();
}
