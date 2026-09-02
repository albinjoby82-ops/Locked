/**
 * Builds `data/exercises.csv` from the free-exercise-db dataset.
 *
 * Source: https://github.com/yuhonas/free-exercise-db (Unlicense / public
 * domain) — ~870 English exercises with muscles, equipment, mechanics and
 * step-by-step instructions, plus two photos each.
 *
 * The output is in the same shape the vendored importer already reads, so the
 * import step is unchanged:
 *
 *   npx tsx scripts/build-exercise-csv.ts            # writes data/exercises.csv
 *   npx tsx scripts/import-exercises-with-attributes.ts ./data/exercises.csv
 *
 * The generated CSV is committed, so building it again is only needed to pick up
 * upstream changes. Pass a path to a local `exercises.json` to skip the fetch.
 */
import path from "path";
import fs from "fs";

const SOURCE_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const IMAGE_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";
const OUTPUT_PATH = path.join(process.cwd(), "data", "exercises.csv");

interface SourceExercise {
  id: string;
  name: string;
  force: string | null;
  level: string | null;
  mechanic: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string | null;
  images: string[];
}

interface CsvRow {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  fullVideoUrl: string;
  fullVideoImageUrl: string;
  introduction: string;
  introductionEn: string;
  slug: string;
  slugEn: string;
  attributeName: string;
  attributeValue: string;
}

/** free-exercise-db `category` -> ExerciseAttributeValueEnum (TYPE). */
const TYPE_MAP: Record<string, string> = {
  cardio: "CARDIO",
  "olympic weightlifting": "WEIGHTLIFTING",
  plyometrics: "PLYOMETRICS",
  powerlifting: "POWERLIFTING",
  strength: "STRENGTH",
  stretching: "STRETCHING",
  strongman: "STRONGMAN",
};

/** free-exercise-db muscle names -> ExerciseAttributeValueEnum. */
const MUSCLE_MAP: Record<string, string> = {
  abdominals: "ABDOMINALS",
  abductors: "ABDUCTORS",
  adductors: "ADDUCTORS",
  biceps: "BICEPS",
  calves: "CALVES",
  chest: "CHEST",
  forearms: "FOREARMS",
  glutes: "GLUTES",
  hamstrings: "HAMSTRINGS",
  lats: "LATS",
  "lower back": "BACK",
  "middle back": "BACK",
  neck: "NECK",
  quadriceps: "QUADRICEPS",
  shoulders: "SHOULDERS",
  traps: "TRAPS",
  triceps: "TRICEPS",
};

/** free-exercise-db `equipment` -> ExerciseAttributeValueEnum. */
const EQUIPMENT_MAP: Record<string, string> = {
  bands: "BANDS",
  barbell: "BARBELL",
  "body only": "BODY_ONLY",
  cable: "CABLE",
  dumbbell: "DUMBBELL",
  "e-z curl bar": "EZ_BAR",
  "exercise ball": "SWISS_BALL",
  "foam roll": "FOAM_ROLL",
  kettlebells: "KETTLEBELLS",
  machine: "MACHINE",
  "medicine ball": "MEDICINE_BALL",
  other: "OTHER",
};

/** free-exercise-db `mechanic` -> ExerciseAttributeValueEnum. */
const MECHANIC_MAP: Record<string, string> = {
  compound: "COMPOUND",
  isolation: "ISOLATION",
};

const CSV_HEADER = [
  "id",
  "name",
  "name_en",
  "description",
  "description_en",
  "full_video_url",
  "full_video_image_url",
  "introduction",
  "introduction_en",
  "slug",
  "slug_en",
  "attribute_name",
  "attribute_value",
];

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function toParagraphs(lines: string[]): string {
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}

/** A one-line "what this is" blurb, since the dataset has no prose summary. */
function buildIntroduction(exercise: SourceExercise): string {
  const muscles = exercise.primaryMuscles.map((muscle) => muscle.replace(/\b\w/g, (c) => c.toUpperCase())).join(", ");
  const level = exercise.level ? `${exercise.level} ` : "";
  const equipment = exercise.equipment && exercise.equipment !== "None" ? exercise.equipment : "no equipment";
  const type = exercise.category ?? "strength";

  return `<p>A ${level}${type} exercise${muscles ? ` targeting the <strong>${escapeHtml(muscles)}</strong>` : ""}, using ${escapeHtml(
    equipment,
  )}.</p>`;
}

function csvCell(value: string): string {
  if (value === "") return "";
  return `"${value.replace(/"/g, "\"\"")}"`;
}

function toCsv(rows: CsvRow[]): string {
  const lines = [CSV_HEADER.join(",")];

  for (const row of rows) {
    lines.push(
      [
        csvCell(row.id),
        csvCell(row.name),
        csvCell(row.nameEn),
        csvCell(row.description),
        csvCell(row.descriptionEn),
        csvCell(row.fullVideoUrl),
        csvCell(row.fullVideoImageUrl),
        csvCell(row.introduction),
        csvCell(row.introductionEn),
        csvCell(row.slug),
        csvCell(row.slugEn),
        row.attributeName,
        row.attributeValue,
      ].join(","),
    );
  }

  return `${lines.join("\n")}\n`;
}

function buildAttributes(exercise: SourceExercise): { name: string; value: string }[] {
  const attributes: { name: string; value: string }[] = [];
  const warn = (label: string, value: string) => console.warn(`⚠️  Unmapped ${label} "${value}" on "${exercise.name}" — skipped`);

  const type = TYPE_MAP[exercise.category ?? ""];
  if (type) {
    attributes.push({ name: "TYPE", value: type });
  } else if (exercise.category) {
    warn("category", exercise.category);
  }

  // "lower back" and "middle back" both map to BACK, so de-duplicate.
  const seenPrimary = new Set<string>();
  for (const muscle of exercise.primaryMuscles) {
    const mapped = MUSCLE_MAP[muscle];
    if (!mapped) {
      warn("muscle", muscle);
      continue;
    }
    if (seenPrimary.has(mapped)) continue;
    seenPrimary.add(mapped);
    attributes.push({ name: "PRIMARY_MUSCLE", value: mapped });
  }

  const seenSecondary = new Set<string>();
  for (const muscle of exercise.secondaryMuscles) {
    const mapped = MUSCLE_MAP[muscle];
    if (!mapped) {
      warn("muscle", muscle);
      continue;
    }
    // A muscle listed as both primary and secondary is only worth recording once.
    if (seenSecondary.has(mapped) || seenPrimary.has(mapped)) continue;
    seenSecondary.add(mapped);
    attributes.push({ name: "SECONDARY_MUSCLE", value: mapped });
  }

  // Equipment is "None" for a handful of stretches; the importer maps NONE to NA.
  attributes.push({ name: "EQUIPMENT", value: EQUIPMENT_MAP[exercise.equipment ?? ""] ?? "NONE" });

  const mechanic = MECHANIC_MAP[exercise.mechanic ?? ""];
  if (mechanic) attributes.push({ name: "MECHANICS_TYPE", value: mechanic });

  return attributes;
}

async function loadSource(localPath?: string): Promise<SourceExercise[]> {
  if (localPath) {
    console.log(`📂 Reading ${localPath}`);
    return JSON.parse(fs.readFileSync(localPath, "utf8"));
  }

  console.log(`🌐 Fetching ${SOURCE_URL}`);
  const response = await fetch(SOURCE_URL);
  if (!response.ok) throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);

  return (await response.json()) as SourceExercise[];
}

async function main() {
  const exercises = await loadSource(process.argv[2]);
  console.log(`🏋️  ${exercises.length} exercises in the source dataset`);

  const rows: CsvRow[] = [];
  const usedSlugs = new Set<string>();

  for (const exercise of exercises) {
    let slug = slugify(exercise.name);
    if (!slug) slug = slugify(exercise.id);
    if (usedSlugs.has(slug)) {
      let suffix = 2;
      while (usedSlugs.has(`${slug}-${suffix}`)) suffix++;
      slug = `${slug}-${suffix}`;
    }
    usedSlugs.add(slug);

    // The app is English-only, so the localised columns carry the same English text.
    const description = toParagraphs(exercise.instructions);
    const introduction = buildIntroduction(exercise);
    const image = exercise.images[0] ? `${IMAGE_BASE}/${exercise.images[0]}` : "";

    const base: Omit<CsvRow, "attributeName" | "attributeValue"> = {
      id: exercise.id,
      name: exercise.name,
      nameEn: exercise.name,
      description,
      descriptionEn: description,
      fullVideoUrl: "",
      fullVideoImageUrl: image,
      introduction,
      introductionEn: introduction,
      slug,
      slugEn: `${slug}-en`,
    };

    // The importer takes an exercise's fields from the first row it sees for a
    // given id and only reads attribute_name/attribute_value off the rest, so
    // repeating the (long) text columns on every row would just bloat the file.
    const blank: Omit<CsvRow, "attributeName" | "attributeValue"> = {
      id: exercise.id,
      name: "",
      nameEn: "",
      description: "",
      descriptionEn: "",
      fullVideoUrl: "",
      fullVideoImageUrl: "",
      introduction: "",
      introductionEn: "",
      slug: "",
      slugEn: "",
    };

    buildAttributes(exercise).forEach((attribute, index) => {
      rows.push({ ...(index === 0 ? base : blank), attributeName: attribute.name, attributeValue: attribute.value });
    });
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, toCsv(rows), "utf8");

  console.log(`✅ Wrote ${rows.length} rows for ${exercises.length} exercises to ${path.relative(process.cwd(), OUTPUT_PATH)}`);
}

main().catch((error) => {
  console.error("❌ Failed to build the exercise CSV:", error);
  process.exit(1);
});
