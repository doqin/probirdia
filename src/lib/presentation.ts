import type { CharacterDef, DialoguePosition, Presentation, PropDef, Slot, StageDef } from './types';

export const SLOT_X: Record<Slot, number> = { left: 14, center: 50, right: 86 };

export interface ResolvedScene {
  stage?: StageDef;
  dialogue: DialoguePosition;
  characters: { slot: Slot; id: string; def: CharacterDef }[];
  props: { id: string; def: PropDef }[];
  noteOn?: string;
  headingInArt: boolean;
}

/** Merges every matching rule, in file order, into what one scene should look like. */
export function resolveScene(presentation: Presentation | undefined, sceneId: string): ResolvedScene {
  const out: ResolvedScene = { dialogue: 'bottom', characters: [], props: [], headingInArt: false };
  if (!presentation) return out;

  let stageId: string | undefined;
  let dialogue: DialoguePosition | undefined;
  let slots: Partial<Record<Slot, string | null>> = {};
  let props: string[] = [];

  for (const rule of presentation.scenes) {
    if (rule.ids !== '*' && !rule.ids.includes(sceneId)) continue;
    if (rule.stage !== undefined) stageId = rule.stage;
    if (rule.dialogue !== undefined) dialogue = rule.dialogue;
    if (rule.characters !== undefined) slots = { ...slots, ...rule.characters };
    if (rule.props !== undefined) props = rule.props;
    if (rule.noteOn !== undefined) out.noteOn = rule.noteOn;
    if (rule.headingInArt !== undefined) out.headingInArt = rule.headingInArt;
  }

  out.stage = stageId ? presentation.stages[stageId] : undefined;
  out.dialogue = dialogue ?? out.stage?.dialogue ?? 'bottom';
  for (const slot of Object.keys(slots) as Slot[]) {
    const id = slots[slot];
    if (id) out.characters.push({ slot, id, def: presentation.characters[id] });
  }
  out.props = props.map((id) => ({ id, def: presentation.props[id] }));
  return out;
}