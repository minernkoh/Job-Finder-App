/**
 * Provider registry — the single source of the job-source list. Orchestration and tests
 * import ALL_PROVIDERS from here so the set of sources is defined in exactly one place.
 */

import { adzunaProvider } from "./adzuna.provider";
import { mcfProvider } from "./mcf.provider";
import { linkedinProvider } from "./linkedin.provider";
import { jobstreetProvider } from "./jobstreet.provider";
import type { JobProvider } from "./types";

/** Every job provider, in fan-out order. Adzuna first (global), then the SG-only sources. */
export const ALL_PROVIDERS: JobProvider[] = [
  adzunaProvider,
  mcfProvider,
  linkedinProvider,
  jobstreetProvider,
];

export type {
  JobProvider,
  NormalizedJob,
  ProviderResult,
  SearchContext,
} from "./types";
