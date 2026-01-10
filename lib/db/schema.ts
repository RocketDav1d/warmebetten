import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["public", "provider", "admin"]);

export const berlinBezirkEnum = pgEnum("berlin_bezirk", [
  "mitte",
  "friedrichshain_kreuzberg",
  "pankow",
  "charlottenburg_wilmersdorf",
  "spandau",
  "steglitz_zehlendorf",
  "tempelhof_schoeneberg",
  "neukoelln",
  "treptow_koepenick",
  "marzahn_hellersdorf",
  "lichtenberg",
  "reinickendorf",
]);

export const unterkuenfte = pgTable(
  "unterkuenfte",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    createdBy: uuid("created_by"),
    ownerUserId: uuid("owner_user_id"),

    bezirk: berlinBezirkEnum("bezirk"),
    name: text("name").notNull(),
    adresse: text("adresse").notNull(),
    strasse: text("strasse"),

    // Coordinates are optional because some sources don't provide geocoding.
    // Rows without coordinates can still be stored (e.g. for later enrichment),
    // but should be filtered out in map rendering/queries if needed.
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),

    uBahnStation: text("u_bahn_station"),
    sBahnStation: text("s_bahn_station"),
    bus: text("bus"),

    telefon: text("telefon"),
    email: text("email"),
    website: text("website"),
    verantwortlichePersonen: text("verantwortliche_personen")
      .array()
      .notNull()
      .default([]),
    metadata: text("metadata"),

    oeffnungVon: time("oeffnung_von"),
    oeffnungBis: time("oeffnung_bis"),
    letzterEinlass: time("letzter_einlass"),

    kaelteWaermeBusKannKommenVon: time("kaelte_waerme_bus_kann_kommen_von"),
    kaelteWaermeBusKannKommenBis: time("kaelte_waerme_bus_kann_kommen_bis"),

    keineDrogen: boolean("keine_drogen").notNull().default(false),
    keineTiere: boolean("keine_tiere").notNull().default(false),
    keineGewalt: boolean("keine_gewalt").notNull().default(false),

    bietetDusche: boolean("bietet_dusche").notNull().default(false),
    bietetEssen: boolean("bietet_essen").notNull().default(false),
    bietetBetreuung: boolean("bietet_betreuung").notNull().default(false),
    bietetKleidung: boolean("bietet_kleidung").notNull().default(false),
    bietetMedizin: boolean("bietet_medizin").notNull().default(false),
    behindertengerecht: boolean("behindertengerecht").notNull().default(false),

    kapazitaetMaxAllgemein: integer("kapazitaet_max_allgemein")
      .notNull()
      .default(0),
    kapazitaetMaxFrauen: integer("kapazitaet_max_frauen").notNull().default(0),
    kapazitaetMaxMaenner: integer("kapazitaet_max_maenner")
      .notNull()
      .default(0),

    // Source of truth
    plaetzeFreiAktuell: integer("plaetze_frei_aktuell").notNull().default(0),

    // Derived convenience columns (generated in DB)
    kapazitaetBelegt: integer("kapazitaet_belegt")
      .generatedAlwaysAs(
        sql`greatest(kapazitaet_max_allgemein - plaetze_frei_aktuell, 0)`,
      )
      .notNull(),
    plaetzeFrei: integer("plaetze_frei")
      .generatedAlwaysAs(sql`plaetze_frei_aktuell`)
      .notNull(),
    bettenFrei: boolean("betten_frei")
      .generatedAlwaysAs(sql`(plaetze_frei_aktuell > 0)`)
      .notNull(),
  },
  (t) => ({
    latLngIdx: index("unterkuenfte_lat_lng_idx").on(t.lat, t.lng),
    ownerIdx: index("unterkuenfte_owner_user_id_idx").on(t.ownerUserId),
  }),
);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  fullName: text("full_name"),
  role: userRoleEnum("role").notNull().default("public"),
});

/**
 * Shelter email whitelist:
 * If a user signs up with a whitelisted email for a shelter, they can be auto-connected.
 */
export const unterkunftEmailWhitelist = pgTable(
  "unterkunft_email_whitelist",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    unterkunftId: uuid("unterkunft_id")
      .notNull()
      .references(() => unterkuenfte.id, { onDelete: "cascade" }),
    // Store normalized lowercase emails to make equality checks deterministic.
    email: text("email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    unterkunftEmailUnique: uniqueIndex("unterkunft_email_whitelist_unique").on(
      t.unterkunftId,
      t.email,
    ),
    unterkunftIdx: index("unterkunft_email_whitelist_unterkunft_idx").on(
      t.unterkunftId,
    ),
  }),
);

export const unterkunftApplicationStatusEnum = pgEnum(
  "unterkunft_application_status",
  ["pending", "approved", "rejected"],
);

/**
 * Applications (manual admin approval):
 * Users can register, but the shelter connection is created only after personal contact + admin approval.
 */
export const unterkunftApplications = pgTable(
  "unterkunft_applications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    unterkunftId: uuid("unterkunft_id")
      .notNull()
      .references(() => unterkuenfte.id, { onDelete: "cascade" }),

    // auth.users.id
    userId: uuid("user_id").notNull(),

    // store normalized lowercase email used at application time (for audit)
    email: text("email").notNull(),

    status: unterkunftApplicationStatusEnum("status")
      .notNull()
      .default("pending"),

    // filled by admin on approval/rejection
    reviewedByUserId: uuid("reviewed_by_user_id"),
    adminNote: text("admin_note"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (t) => ({
    pendingIdx: index("unterkunft_applications_status_idx").on(t.status),
    unterkunftIdx: index("unterkunft_applications_unterkunft_idx").on(
      t.unterkunftId,
    ),
    userUnterkunftUnique: uniqueIndex(
      "unterkunft_applications_user_unterkunft_unique",
    ).on(t.userId, t.unterkunftId),
  }),
);


