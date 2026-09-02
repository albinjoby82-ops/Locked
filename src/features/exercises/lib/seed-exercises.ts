import path from "path";
import fs from "fs";

import { ExerciseAttributeNameEnum, ExerciseAttributeValueEnum } from "@prisma/client";

import { prisma } from "@/shared/lib/prisma";

/**
 * Importing `data/exercises.csv` into the database, in resumable batches.
 *
 * `scripts/import-exercises-with-attributes.ts` does the same job from a
 * laptop, but it makes roughly twenty round trips per exercise — fine for a
 * one-off terminal run, far too slow for an HTTP request. This version
 * preloads the small fixed set of attribute names and values, then works a
 * batch at a time with a handful of queries each, so it can be driven from a
 * browser without hitting a function timeout.
 */

/** Columns of the generated CSV — see scripts/build-exercise-csv.ts. */
const COLUMNS = [
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
] as const;

interface ParsedExercise {
  originalId: string;
  name: string;
  nameEn: string | null;
  description: string | null;
  descriptionEn: string | null;
  fullVideoUrl: string | null;
  fullVideoImageUrl: string | null;
  introduction: string | null;
  introductionEn: string | null;
  slug: string;
  slugEn: string | null;
  attributes: { attributeName: ExerciseAttributeNameEnum; attributeValue: ExerciseAttributeValueEnum }[];
}

export interface SeedBatchResult {
  processed: number;
  nextOffset: number;
  total: number;
  done: boolean;
}

/**
 * Minimal RFC 4180 reader: the only quoting the generated file uses is double
 * quotes with `""` for an embedded quote, and the exercise descriptions contain
 * commas and newlines, so a naive split would corrupt them.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];

    if (inQuotes) {
      if (char === "\"") {
        if (text[index + 1] === "\"") {
          field += "\"";
          index++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === "\"") {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function cleanValue(value: string | undefined): string | null {
  if (!value || value === "NULL" || value.trim() === "") return null;
  return value.trim();
}

/** Same normalisation the CLI importer uses, so both agree on the data. */
function normalizeAttributeValue(value: string): ExerciseAttributeValueEnum {
  const cleaned = value.trim().toUpperCase();
  if (["N/A", "NA", "NONE", "NULL", ""].includes(cleaned)) return ExerciseAttributeValueEnum.NA;

  if ((Object.values(ExerciseAttributeValueEnum) as string[]).includes(cleaned)) {
    return cleaned as ExerciseAttributeValueEnum;
  }
  throw new Error(`Unknown attribute value: ${value}`);
}

/**
 * The CSV repeats an exercise's id across one row per attribute, carrying the
 * text columns only on the first of them.
 */
export function readExercises(csvPath: string): ParsedExercise[] {
  const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
  const [header, ...body] = rows;

  const columnIndex = new Map(COLUMNS.map((column) => [column, header.indexOf(column)]));
  const get = (row: string[], column: (typeof COLUMNS)[number]) => row[columnIndex.get(column) ?? -1];

  const exercises = new Map<string, ParsedExercise>();

  for (const row of body) {
    const originalId = get(row, "id");
    if (!originalId) continue;

    let exercise = exercises.get(originalId);

    if (!exercise) {
      exercise = {
        originalId,
        name: get(row, "name") ?? originalId,
        nameEn: cleanValue(get(row, "name_en")),
        description: cleanValue(get(row, "description")),
        descriptionEn: cleanValue(get(row, "description_en")),
        fullVideoUrl: cleanValue(get(row, "full_video_url")),
        fullVideoImageUrl: cleanValue(get(row, "full_video_image_url")),
        introduction: cleanValue(get(row, "introduction")),
        introductionEn: cleanValue(get(row, "introduction_en")),
        slug: cleanValue(get(row, "slug")) ?? `exercise-${originalId}`,
        slugEn: cleanValue(get(row, "slug_en")),
        attributes: [],
      };
      exercises.set(originalId, exercise);
    }

    const attributeName = cleanValue(get(row, "attribute_name"));
    const attributeValue = cleanValue(get(row, "attribute_value"));

    if (attributeName && attributeValue) {
      exercise.attributes.push({
        attributeName: attributeName as ExerciseAttributeNameEnum,
        attributeValue: normalizeAttributeValue(attributeValue),
      });
    }
  }

  return Array.from(exercises.values());
}

export function exerciseCsvPath(): string {
  return path.join(process.cwd(), "data", "exercises.csv");
}

/**
 * Ensures every attribute name and value row exists, and returns a lookup for
 * them. There are five names and about sixty values in total, so this is a few
 * queries once rather than two per attribute row.
 */
async function loadAttributeLookup() {
  const names = Object.values(ExerciseAttributeNameEnum);
  const values = Object.values(ExerciseAttributeValueEnum);

  await prisma.exerciseAttributeName.createMany({
    data: names.map((name) => ({ name })),
    skipDuplicates: true,
  });

  const nameRows = await prisma.exerciseAttributeName.findMany({ select: { id: true, name: true } });
  const nameIds = new Map(nameRows.map((row) => [row.name, row.id]));

  await prisma.exerciseAttributeValue.createMany({
    data: nameRows.flatMap((nameRow) => values.map((value) => ({ attributeNameId: nameRow.id, value }))),
    skipDuplicates: true,
  });

  const valueRows = await prisma.exerciseAttributeValue.findMany({ select: { id: true, attributeNameId: true, value: true } });
  const valueIds = new Map(valueRows.map((row) => [`${row.attributeNameId}:${row.value}`, row.id]));

  return { nameIds, valueIds };
}

/**
 * Imports one batch, starting at `offset`. Safe to re-run: exercises are
 * matched on their unique slug and their attributes are rewritten rather than
 * appended, so a repeated or overlapping batch converges on the same state.
 */
export async function seedExerciseBatch({ offset, limit }: { offset: number; limit: number }): Promise<SeedBatchResult> {
  const all = readExercises(exerciseCsvPath());
  const batch = all.slice(offset, offset + limit);

  if (batch.length === 0) {
    return { processed: 0, nextOffset: offset, total: all.length, done: true };
  }

  const { nameIds, valueIds } = await loadAttributeLookup();

  // Existing rows keep their fields; this only fills in what's missing.
  await prisma.exercise.createMany({
    data: batch.map((exercise) => ({
      name: exercise.name,
      nameEn: exercise.nameEn,
      description: exercise.description,
      descriptionEn: exercise.descriptionEn,
      fullVideoUrl: exercise.fullVideoUrl,
      fullVideoImageUrl: exercise.fullVideoImageUrl,
      introduction: exercise.introduction,
      introductionEn: exercise.introductionEn,
      slug: exercise.slug,
      slugEn: exercise.slugEn,
    })),
    skipDuplicates: true,
  });

  // createMany can't return ids, so read them back by the slug we just wrote.
  const slugs = batch.map((exercise) => exercise.slug);
  const created = await prisma.exercise.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } });
  const idBySlug = new Map(created.map((row) => [row.slug, row.id]));

  const exerciseIds = Array.from(idBySlug.values());
  await prisma.exerciseAttribute.deleteMany({ where: { exerciseId: { in: exerciseIds } } });

  const attributeRows = batch.flatMap((exercise) => {
    const exerciseId = idBySlug.get(exercise.slug);
    if (!exerciseId) return [];

    return exercise.attributes.flatMap((attribute) => {
      const attributeNameId = nameIds.get(attribute.attributeName);
      if (!attributeNameId) return [];

      const attributeValueId = valueIds.get(`${attributeNameId}:${attribute.attributeValue}`);
      if (!attributeValueId) return [];

      return [{ exerciseId, attributeNameId, attributeValueId }];
    });
  });

  await prisma.exerciseAttribute.createMany({ data: attributeRows });

  const nextOffset = offset + batch.length;
  return { processed: batch.length, nextOffset, total: all.length, done: nextOffset >= all.length };
}
