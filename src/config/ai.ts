import { env } from "./env";

/** Default Claude model for all AI generation endpoints. Override via ANTHROPIC_MODEL env var. */
export const ANTHROPIC_MODEL = env.ANTHROPIC_MODEL;
