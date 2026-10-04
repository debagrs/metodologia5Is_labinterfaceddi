import type {
  CharacterAppearance,
  CharacterAccessory,
  CharacterAccessoryKind,
} from "../types";
export const CHARACTER_CONTROLS: Array<{
  section: string;
  key: keyof CharacterAppearance;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}> = [
  ["face", "headWidth", "Largura da cabeça", 0.75, 1.25, 0.01, 1],
  ["face", "headHeight", "Altura da cabeça", 0.8, 1.2, 0.01, 1],
  ["face", "eyeSize", "Tamanho dos olhos", 0.55, 1.5, 0.01, 1],
  ["face", "eyeSpacing", "Distância entre olhos", 0.65, 1.3, 0.01, 1],
  ["face", "eyeHeight", "Altura dos olhos", -10, 10, 1, 0],
  ["face", "irisScale", "Tamanho da íris", 0.5, 1.25, 0.01, 1],
  ["face", "browSize", "Espessura das sobrancelhas", 0.5, 1.8, 0.01, 1],
  ["face", "browHeight", "Altura das sobrancelhas", -10, 10, 1, 0],
  ["face", "noseSize", "Tamanho do nariz", 0.5, 1.7, 0.01, 1],
  ["face", "noseHeight", "Altura do nariz", -8, 8, 1, 0],
  ["face", "mouthSize", "Tamanho da boca", 0.5, 1.5, 0.01, 1],
  ["face", "mouthHeight", "Altura da boca", -8, 8, 1, 0],
  ["face", "earSize", "Tamanho das orelhas", 0.5, 1.6, 0.01, 1],
  ["face", "earAngle", "Inclinação das orelhas", -30, 30, 1, 0],
  ["face", "hairVolume", "Volume do cabelo", 0.85, 1.25, 0.01, 1],
  ["face", "muzzleSize", "Tamanho do focinho / bico", 0.5, 1.7, 0.01, 1],
  ["face", "muzzleHeight", "Altura do focinho / bico", -8, 8, 1, 0],
  ["body", "armLength", "Comprimento dos braços", 0.7, 1.25, 0.01, 1],
  ["body", "armWidth", "Espessura dos braços", 0.65, 1.4, 0.01, 1],
  ["body", "legLength", "Comprimento das pernas", 0.7, 1.25, 0.01, 1],
  ["body", "legWidth", "Espessura das pernas", 0.65, 1.4, 0.01, 1],
  ["body", "handSize", "Tamanho das mãos", 0.6, 1.5, 0.01, 1],
  ["body", "footSize", "Tamanho dos pés / patas", 0.65, 1.5, 0.01, 1],
  ["body", "waistWidth", "Largura da cintura", 0.7, 1.3, 0.01, 1],
  ["details", "tailSize", "Comprimento da cauda", 0.5, 1.6, 0.01, 1],
  ["details", "wingSize", "Tamanho das asas", 0.5, 1.4, 0.01, 1],
  ["details", "hornSize", "Tamanho dos chifres / antenas", 0.5, 1.5, 0.01, 1],
  ["details", "whiskerLength", "Comprimento dos bigodes", 0.5, 1.6, 0.01, 1],
  ["colors", "strokeWidth", "Espessura do contorno", 0.8, 3.5, 0.1, 1.8],
].map(([section, key, label, min, max, step, defaultValue]) => ({
  section: section as string,
  key: key as keyof CharacterAppearance,
  label: label as string,
  min: min as number,
  max: max as number,
  step: step as number,
  defaultValue: defaultValue as number,
}));
export const ACCESSORY_CATALOG: Array<{
  kind: CharacterAccessoryKind;
  label: string;
  color: string;
}> = [
  { kind: "glasses", label: "Óculos", color: "#373547" },
  { kind: "sunglasses", label: "Óculos de sol", color: "#403448" },
  { kind: "hat", label: "Chapéu", color: "#755B45" },
  { kind: "cap", label: "Boné", color: "#426F86" },
  { kind: "beanie", label: "Gorro", color: "#867498" },
  { kind: "scarf", label: "Cachecol", color: "#C87575" },
  { kind: "backpack", label: "Mochila", color: "#768F77" },
  { kind: "headphones", label: "Fones", color: "#46425D" },
  { kind: "earrings", label: "Brincos", color: "#CBA563" },
  { kind: "necklace", label: "Colar", color: "#CBA563" },
  { kind: "bow", label: "Laço", color: "#C97989" },
  { kind: "crown", label: "Coroa", color: "#DDB65F" },
  { kind: "bracelet", label: "Pulseiras", color: "#CBA563" },
  { kind: "belt", label: "Cinto", color: "#63503F" },
];
export function characterAccessories(
  a: CharacterAppearance,
): CharacterAccessory[] {
  if (Array.isArray(a.accessories)) return a.accessories;
  return a.accessory && a.accessory !== "none"
    ? [
        {
          id: `legacy-${a.accessory}`,
          kind: a.accessory,
          color: a.outfitSecondary,
          scale: 1,
          x: 0,
          y: 0,
        },
      ]
    : [];
}
export function normalizeAppearance(
  a: CharacterAppearance,
): CharacterAppearance {
  return {
    ...a,
    accessories: characterAccessories(a),
    noseStyle: a.muzzleStyle?.startsWith("beak") ? "none" : a.noseStyle,
  };
}
export const metric = (
  a: CharacterAppearance,
  key: keyof CharacterAppearance,
  fallback = 1,
) => {
  const control = CHARACTER_CONTROLS.find((item) => item.key === key),
    n = Number(a[key]);
  return Number.isFinite(n)
    ? Math.max(control?.min ?? -180, Math.min(control?.max ?? 180, n))
    : fallback;
};
