import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import { profiles, unterkuenfte } from "./schema";

export type Unterkunft = InferSelectModel<typeof unterkuenfte>;
export type NewUnterkunft = InferInsertModel<typeof unterkuenfte>;

export type Profile = InferSelectModel<typeof profiles>;
export type NewProfile = InferInsertModel<typeof profiles>;


