import { z } from "zod";

export const WorkoutSetInput = z.object({
  reps: z.int().nullable().describe("Target reps"),
  weight: z.number().nullable().describe("Target weight"),
  duration: z.int().nullable().describe("Duration in seconds"),
  rest_time: z.int().nullable().describe("Rest after this set in seconds"),
  tempo: z.string().nullable().describe("Tempo notation (e.g., 3-1-2-0)"),
});

export const ExerciseInput = z.object({
  name: z.string().describe("Exercise name"),
  equipment: z.string().nullable().describe("Required equipment"),
  sets: z.array(WorkoutSetInput),
});

export const ExerciseBlockInput = z.object({
  structure_type: z
    .enum(["straight", "superset", "circuit", "drop_set"])
    .describe("How exercises in this block are performed"),
  rounds: z
    .int()
    .nullable()
    .describe(
      "Number of rounds for circuit blocks. Each exercise should have this many sets (one per round). Defaults to 1."
    ),
  exercises: z.array(ExerciseInput).describe("Exercises in this block"),
});

export const CreateWorkoutInput = z.object({
  name: z.string().describe("Workout name (e.g., 'Upper Body Push', 'Leg Day')"),
  date: z.string().describe("Date in YYYY-MM-DD format"),
  exercise_blocks: z.array(ExerciseBlockInput).describe("Ordered list of exercise blocks"),
  notes: z.string().nullable().describe("Optional notes about the workout"),
});

export const GetWorkoutsInput = z.object({
  start_date: z
    .string()
    .optional()
    .describe("Start of date range in YYYY-MM-DD format. Defaults to 7 days ago if omitted."),
  end_date: z
    .string()
    .optional()
    .describe("End of date range in YYYY-MM-DD format. Defaults to today if omitted."),
  date: z
    .string()
    .optional()
    .describe("Exact date filter in YYYY-MM-DD format. If provided, overrides start_date/end_date."),
});

export const UpdateWorkoutInput = z.object({
  workout_id: z.string().describe("ID of the workout to update"),
  name: z.string().optional().describe("Updated workout name"),
  exercise_blocks: z
    .array(ExerciseBlockInput)
    .optional()
    .describe("Updated exercise blocks — full replacement of all blocks"),
  notes: z.string().nullable().optional().describe("Updated notes"),
});

export const PatchBlockUpdate = z.object({
  block_id: z
    .string()
    .describe("ID of the exercise block to modify (from get_workouts or get_page_data)"),
  structure_type: z
    .enum(["straight", "superset", "circuit", "drop_set"])
    .optional()
    .describe("New structure type for this block"),
  rounds: z
    .number()
    .int()
    .nullable()
    .optional()
    .describe("New round count (for circuits)"),
  exercises: z
    .array(ExerciseInput)
    .optional()
    .describe(
      "Replacement exercises for this block. Only the exercises in this block are replaced; other blocks remain untouched."
    ),
});

export const PatchWorkoutInput = z.object({
  workout_id: z.string().describe("ID of the workout to patch"),
  name: z.string().optional().describe("Updated workout name"),
  notes: z.string().nullable().optional().describe("Updated notes"),
  update_blocks: z
    .array(PatchBlockUpdate)
    .optional()
    .describe(
      "Blocks to update, identified by block_id. Only the specified blocks are modified; all other blocks remain exactly as they are."
    ),
  remove_block_ids: z
    .array(z.string())
    .optional()
    .describe("Block IDs to remove entirely from the workout"),
  add_blocks: z
    .array(ExerciseBlockInput)
    .optional()
    .describe("New exercise blocks to append to the workout"),
});

export const DeleteWorkoutInput = z.object({
  workout_id: z.string().describe("ID of the workout to delete"),
});
