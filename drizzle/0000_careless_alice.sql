CREATE TYPE "public"."berlin_bezirk" AS ENUM('mitte', 'friedrichshain_kreuzberg', 'pankow', 'charlottenburg_wilmersdorf', 'spandau', 'steglitz_zehlendorf', 'tempelhof_schoeneberg', 'neukoelln', 'treptow_koepenick', 'marzahn_hellersdorf', 'lichtenberg', 'reinickendorf');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('public', 'provider', 'admin');--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"full_name" text,
	"role" "user_role" DEFAULT 'public' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unterkuenfte" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"owner_user_id" uuid,
	"bezirk" "berlin_bezirk",
	"name" text NOT NULL,
	"adresse" text NOT NULL,
	"strasse" text,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"u_bahn_station" text,
	"s_bahn_station" text,
	"bus" text,
	"telefon" text,
	"email" text,
	"website" text,
	"verantwortliche_personen" text[] DEFAULT '{}' NOT NULL,
	"metadata" text,
	"oeffnung_von" time,
	"oeffnung_bis" time,
	"letzter_einlass" time,
	"kaelte_waerme_bus_kann_kommen_von" time,
	"kaelte_waerme_bus_kann_kommen_bis" time,
	"keine_drogen" boolean DEFAULT false NOT NULL,
	"keine_tiere" boolean DEFAULT false NOT NULL,
	"keine_gewalt" boolean DEFAULT false NOT NULL,
	"bietet_dusche" boolean DEFAULT false NOT NULL,
	"bietet_essen" boolean DEFAULT false NOT NULL,
	"bietet_betreuung" boolean DEFAULT false NOT NULL,
	"bietet_kleidung" boolean DEFAULT false NOT NULL,
	"bietet_medizin" boolean DEFAULT false NOT NULL,
	"behindertengerecht" boolean DEFAULT false NOT NULL,
	"kapazitaet_max_allgemein" integer DEFAULT 0 NOT NULL,
	"kapazitaet_max_frauen" integer DEFAULT 0 NOT NULL,
	"kapazitaet_max_maenner" integer DEFAULT 0 NOT NULL,
	"plaetze_frei_aktuell" integer DEFAULT 0 NOT NULL,
	"kapazitaet_belegt" integer GENERATED ALWAYS AS (greatest(kapazitaet_max_allgemein - plaetze_frei_aktuell, 0)) STORED NOT NULL,
	"plaetze_frei" integer GENERATED ALWAYS AS (plaetze_frei_aktuell) STORED NOT NULL,
	"betten_frei" boolean GENERATED ALWAYS AS ((plaetze_frei_aktuell > 0)) STORED NOT NULL
);
--> statement-breakpoint
CREATE INDEX "unterkuenfte_lat_lng_idx" ON "unterkuenfte" USING btree ("lat","lng");--> statement-breakpoint
CREATE INDEX "unterkuenfte_owner_user_id_idx" ON "unterkuenfte" USING btree ("owner_user_id");