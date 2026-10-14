/**
 * Conditions used by `route_N_if` columns in scenes.csv, e.g. `status:Injured and not has:Shield of Frost`.
 *
 * Atoms:  has:<item>   status:<status>   relics>=N   relics<=N   relics>N   relics<N   relics=N
 * Joined with `and`, `or`, `not` (not binds tightest, then and, then or). No brackets.
 */

export interface Facts {
  items: string[];
  status: string[];
  /** How many of the items are relics (see `relics` in game.json). */
  relics: number;
}

type Atom =
  | { kind: 'has'; name: string }
  | { kind: 'status'; name: string }
  | { kind: 'relics'; op: '>=' | '<=' | '>' | '<' | '='; n: number };

interface Literal {
  not: boolean;
  atom: Atom;
}

/** Disjunction of conjunctions: any group whose literals all hold makes the condition true. */
export interface Condition {
  groups: Literal[][];
}

const norm = (s: string) => s.trim().toLowerCase();

function parseAtom(text: string): Atom {
  const named = /^(has|status)\s*:\s*(.+)$/i.exec(text);
  if (named) return { kind: named[1].toLowerCase() as 'has' | 'status', name: named[2].trim() };
  const count = /^relics\s*(>=|<=|>|<|=)\s*(\d+)$/i.exec(text);
  if (count) return { kind: 'relics', op: count[1] as '>=' | '<=' | '>' | '<' | '=', n: Number(count[2]) };
  throw new Error(`cannot understand "${text}" (use has:<item>, status:<name> or relics>=N)`);
}

/** Throws an Error with a plain-language message when the text is not a valid condition. */
export function parseCondition(source: string): Condition {
  const text = source.trim();
  if (!text) throw new Error('the condition is empty');
  const groups = text.split(/\s+or\s+/i).map((part) =>
    part.split(/\s+and\s+/i).map((lit) => {
      const trimmed = lit.trim();
      const negated = /^not\s+/i.test(trimmed);
      return { not: negated, atom: parseAtom(negated ? trimmed.replace(/^not\s+/i, '') : trimmed) };
    }),
  );
  return { groups };
}

function holds(atom: Atom, f: Facts): boolean {
  switch (atom.kind) {
    case 'has':
      return f.items.some((i) => norm(i) === norm(atom.name));
    case 'status':
      return f.status.some((s) => norm(s) === norm(atom.name));
    case 'relics':
      switch (atom.op) {
        case '>=': return f.relics >= atom.n;
        case '<=': return f.relics <= atom.n;
        case '>': return f.relics > atom.n;
        case '<': return f.relics < atom.n;
        default: return f.relics === atom.n;
      }
  }
}

export function evaluate(cond: Condition, facts: Facts): boolean {
  return cond.groups.some((group) => group.every((lit) => holds(lit.atom, facts) !== lit.not));
}

/** Item and status names a condition refers to, so the validator can catch typos. */
export function namesIn(cond: Condition): { items: string[]; status: string[] } {
  const items: string[] = [];
  const status: string[] = [];
  for (const lit of cond.groups.flat()) {
    if (lit.atom.kind === 'has') items.push(lit.atom.name);
    else if (lit.atom.kind === 'status') status.push(lit.atom.name);
  }
  return { items, status };
}
