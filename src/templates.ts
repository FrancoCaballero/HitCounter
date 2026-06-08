import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useRun, Split } from "./store";

export type Template = {
  id: string;
  name: string;
  game?: string;
  splits: string[];
  builtin?: boolean;
};

export const BUILTIN_TEMPLATES: Template[] = [
  {
    id: "blank",
    name: "Blank",
    splits: ["Split 1"],
    builtin: true,
  },
  {
    id: "ds1",
    name: "Dark Souls Remastered — Any%",
    game: "Dark Souls",
    builtin: true,
    splits: [
      "Asylum Demon",
      "Taurus Demon",
      "Bell Gargoyles",
      "Capra Demon",
      "Gaping Dragon",
      "Quelaag",
      "Iron Golem",
      "Ornstein & Smough",
      "Four Kings",
      "Seath",
      "Bed of Chaos",
      "Nito",
      "Gwyn",
    ],
  },
  {
    id: "ds3",
    name: "Dark Souls III — All Bosses",
    game: "Dark Souls III",
    builtin: true,
    splits: [
      "Iudex Gundyr",
      "Vordt",
      "Curse-Rotted Greatwood",
      "Crystal Sage",
      "Deacons",
      "Abyss Watchers",
      "Wolnir",
      "Old Demon King",
      "Pontiff",
      "Aldrich",
      "Yhorm",
      "Dancer",
      "Oceiros",
      "Champion Gundyr",
      "Dragonslayer Armour",
      "Lothric Princes",
      "Soul of Cinder",
    ],
  },
  {
    id: "bb",
    name: "Bloodborne — Any%",
    game: "Bloodborne",
    builtin: true,
    splits: [
      "Cleric Beast",
      "Father Gascoigne",
      "Blood-Starved Beast",
      "Vicar Amelia",
      "Witches of Hemwick",
      "Shadow of Yharnam",
      "Rom",
      "The One Reborn",
      "Micolash",
      "Mergo's Wet Nurse",
      "Gehrman",
    ],
  },
  {
    id: "elden",
    name: "Elden Ring — Remembrance Bosses",
    game: "Elden Ring",
    builtin: true,
    splits: [
      "Godrick",
      "Rennala",
      "Radahn",
      "Morgott",
      "Fire Giant",
      "Godskin Duo",
      "Maliketh",
      "Gideon",
      "Godfrey",
      "Radagon / Elden Beast",
    ],
  },
  {
    id: "sekiro",
    name: "Sekiro — Any%",
    game: "Sekiro",
    builtin: true,
    splits: [
      "Gyoubu",
      "Lady Butterfly",
      "Genichiro",
      "Folding Screen Monkeys",
      "Guardian Ape",
      "Corrupted Monk",
      "Owl",
      "Emma",
      "Isshin",
    ],
  },
  {
    id: "hk",
    name: "Hollow Knight — Main Bosses",
    game: "Hollow Knight",
    builtin: true,
    splits: [
      "False Knight",
      "Hornet 1",
      "Mantis Lords",
      "Soul Master",
      "Broken Vessel",
      "Dung Defender",
      "Watcher Knights",
      "Hornet 2",
      "Traitor Lord",
      "Hollow Knight",
    ],
  },
  {
    id: "cuphead",
    name: "Cuphead — All Bosses",
    game: "Cuphead",
    builtin: true,
    splits: [
      "Root Pack",
      "Goopy",
      "Hilda Berg",
      "Cagney",
      "Ribby & Croaks",
      "Baroness",
      "Beppi",
      "Djimmi",
      "Wally",
      "Grim Matchstick",
      "Rumor Honeybottoms",
      "Captain Brineybeard",
      "Sally Stageplay",
      "Werner Werman",
      "Dr. Kahl",
      "Cala Maria",
      "Phantom Express",
      "King Dice",
      "Devil",
    ],
  },
  {
    id: "lies",
    name: "Lies of P — Main Bosses",
    game: "Lies of P",
    builtin: true,
    splits: [
      "Parade Master",
      "Scrapped Watchman",
      "Mad Donkey",
      "King's Flame Fuoco",
      "Fallen Archbishop Andreus",
      "Eldest of Black Rabbit Brotherhood",
      "King of Puppets",
      "Champion Victor",
      "Green Monster of the Swamp",
      "Laxasia",
      "Simon Manus",
      "Nameless Puppet",
    ],
  },
];

type TemplateStore = {
  customs: Template[];
  add: (t: Template) => void;
  remove: (id: string) => void;
  rename: (id: string, name: string) => void;
};

export const useTemplates = create<TemplateStore>()(
  persist(
    (set) => ({
      customs: [],
      add: (t) => set((s) => ({ customs: [...s.customs, t] })),
      remove: (id) => set((s) => ({ customs: s.customs.filter((x) => x.id !== id) })),
      rename: (id, name) =>
        set((s) => ({
          customs: s.customs.map((x) => (x.id === id ? { ...x, name } : x)),
        })),
    }),
    { name: "hitcounter-templates" }
  )
);

export function applyTemplate(t: Template) {
  const blank = (name: string): Split => ({
    id: crypto.randomUUID(),
    name,
    hits: 0,
    timeMs: 0,
    pbHits: null,
    pbTimeMs: null,
  });
  useRun.setState({
    title: t.game || t.name,
    splits: t.splits.map(blank),
    activeIdx: 0,
    totalHits: 0,
    totalPbHits: null,
    totalPbTimeMs: null,
    runStartedAt: null,
    splitStartedAt: null,
    runElapsedMs: 0,
    isRunning: false,
    isFinished: false,
  });
}

export function saveCurrentAsTemplate(name: string): Template {
  const s = useRun.getState();
  const t: Template = {
    id: crypto.randomUUID(),
    name,
    splits: s.splits.map((sp) => sp.name),
  };
  useTemplates.getState().add(t);
  return t;
}
