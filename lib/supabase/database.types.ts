/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * NOTE:
 * This file is normally generated via Supabase CLI:
 *
 * - `npx supabase gen types typescript --local --schema public > lib/supabase/database.types.ts`
 * - or `npx supabase gen types typescript --project-id <ref> --schema public > lib/supabase/database.types.ts`
 *
 * If `supabase` isn't installed / command fails, DON'T redirect output (>)
 * because it will truncate this file to empty.
 *
 * This is a hand-authored baseline derived from `supabase/migrations/*`
 * (focus: tables/enums used by the app).
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          full_name: string | null;
          role: Database["public"]["Enums"]["user_role"];
        };
        Insert: {
          id: string;
          created_at?: string;
          updated_at?: string;
          full_name?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          full_name?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
        };
        Relationships: [];
      };
      unterkuenfte: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          owner_user_id: string | null;
          bezirk: Database["public"]["Enums"]["berlin_bezirk"] | null;
          name: string;
          adresse: string;
          strasse: string | null;
          lat: number | null;
          lng: number | null;
          u_bahn_station: string | null;
          s_bahn_station: string | null;
          bus: string | null;
          telefon: string[] | null;
          email: string[] | null;
          website: string | null;
          verantwortliche_personen: string[];
          metadata: string | null;
          oeffnung_von: string | null;
          oeffnung_bis: string | null;
          letzter_einlass: string | null;
          kaelte_waerme_bus_kann_kommen_von: string | null;
          kaelte_waerme_bus_kann_kommen_bis: string | null;
          keine_drogen: boolean;
          keine_tiere: boolean;
          keine_gewalt: boolean;
          bietet_dusche: boolean;
          bietet_essen: boolean;
          bietet_betreuung: boolean;
          bietet_kleidung: boolean;
          bietet_medizin: boolean;
          behindertengerecht: boolean;
          kapazitaet_max_allgemein: number;
          kapazitaet_max_frauen: number;
          kapazitaet_max_maenner: number;
          plaetze_frei_aktuell: number;
          // generated columns (stored)
          kapazitaet_belegt: number | null;
          plaetze_frei: number | null;
          betten_frei: boolean | null;
          // added later
          typ: Database["public"]["Enums"]["unterkunft_typ"] | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          owner_user_id?: string | null;
          bezirk?: Database["public"]["Enums"]["berlin_bezirk"] | null;
          name: string;
          adresse: string;
          strasse?: string | null;
          lat?: number | null;
          lng?: number | null;
          u_bahn_station?: string | null;
          s_bahn_station?: string | null;
          bus?: string | null;
          telefon?: string[] | null;
          email?: string[] | null;
          website?: string | null;
          verantwortliche_personen?: string[];
          metadata?: string | null;
          oeffnung_von?: string | null;
          oeffnung_bis?: string | null;
          letzter_einlass?: string | null;
          kaelte_waerme_bus_kann_kommen_von?: string | null;
          kaelte_waerme_bus_kann_kommen_bis?: string | null;
          keine_drogen?: boolean;
          keine_tiere?: boolean;
          keine_gewalt?: boolean;
          bietet_dusche?: boolean;
          bietet_essen?: boolean;
          bietet_betreuung?: boolean;
          bietet_kleidung?: boolean;
          bietet_medizin?: boolean;
          behindertengerecht?: boolean;
          kapazitaet_max_allgemein?: number;
          kapazitaet_max_frauen?: number;
          kapazitaet_max_maenner?: number;
          plaetze_frei_aktuell?: number;
          typ?: Database["public"]["Enums"]["unterkunft_typ"] | null;
          // generated columns should not be inserted
          kapazitaet_belegt?: never;
          plaetze_frei?: never;
          betten_frei?: never;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          owner_user_id?: string | null;
          bezirk?: Database["public"]["Enums"]["berlin_bezirk"] | null;
          name?: string;
          adresse?: string;
          strasse?: string | null;
          lat?: number | null;
          lng?: number | null;
          u_bahn_station?: string | null;
          s_bahn_station?: string | null;
          bus?: string | null;
          telefon?: string[] | null;
          email?: string[] | null;
          website?: string | null;
          verantwortliche_personen?: string[];
          metadata?: string | null;
          oeffnung_von?: string | null;
          oeffnung_bis?: string | null;
          letzter_einlass?: string | null;
          kaelte_waerme_bus_kann_kommen_von?: string | null;
          kaelte_waerme_bus_kann_kommen_bis?: string | null;
          keine_drogen?: boolean;
          keine_tiere?: boolean;
          keine_gewalt?: boolean;
          bietet_dusche?: boolean;
          bietet_essen?: boolean;
          bietet_betreuung?: boolean;
          bietet_kleidung?: boolean;
          bietet_medizin?: boolean;
          behindertengerecht?: boolean;
          kapazitaet_max_allgemein?: number;
          kapazitaet_max_frauen?: number;
          kapazitaet_max_maenner?: number;
          plaetze_frei_aktuell?: number;
          typ?: Database["public"]["Enums"]["unterkunft_typ"] | null;
          // generated columns should not be updated
          kapazitaet_belegt?: never;
          plaetze_frei?: never;
          betten_frei?: never;
        };
        Relationships: [];
      };
      unterkunft_email_whitelist: {
        Row: {
          id: string;
          unterkunft_id: string;
          email: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          unterkunft_id: string;
          email: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          unterkunft_id?: string;
          email?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      unterkunft_applications: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          unterkunft_id: string;
          user_id: string;
          email: string;
          status: Database["public"]["Enums"]["unterkunft_application_status"];
          reviewed_by_user_id: string | null;
          admin_note: string | null;
          reviewed_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          unterkunft_id: string;
          user_id: string;
          email: string;
          status?: Database["public"]["Enums"]["unterkunft_application_status"];
          reviewed_by_user_id?: string | null;
          admin_note?: string | null;
          reviewed_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          unterkunft_id?: string;
          user_id?: string;
          email?: string;
          status?: Database["public"]["Enums"]["unterkunft_application_status"];
          reviewed_by_user_id?: string | null;
          admin_note?: string | null;
          reviewed_at?: string | null;
        };
        Relationships: [];
      };
      unterkunft_submissions: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          user_id: string | null;
          email: string;
          status: Database["public"]["Enums"]["unterkunft_submission_status"];
          payload: Json;
          reviewed_by_user_id: string | null;
          admin_note: string | null;
          reviewed_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string | null;
          email: string;
          status?: Database["public"]["Enums"]["unterkunft_submission_status"];
          payload: Json;
          reviewed_by_user_id?: string | null;
          admin_note?: string | null;
          reviewed_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string | null;
          email?: string;
          status?: Database["public"]["Enums"]["unterkunft_submission_status"];
          payload?: Json;
          reviewed_by_user_id?: string | null;
          admin_note?: string | null;
          reviewed_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: "public" | "provider" | "admin";
      berlin_bezirk:
        | "mitte"
        | "friedrichshain_kreuzberg"
        | "pankow"
        | "charlottenburg_wilmersdorf"
        | "spandau"
        | "steglitz_zehlendorf"
        | "tempelhof_schoeneberg"
        | "neukoelln"
        | "treptow_koepenick"
        | "marzahn_hellersdorf"
        | "lichtenberg"
        | "reinickendorf";
      unterkunft_typ:
        | "notuebernachtung"
        | "nachtcafe"
        | "tagesangebote"
        | "essen_verpflegung"
        | "medizinische_hilfen"
        | "suchtangebote"
        | "beratung"
        | "hygiene"
        | "kleiderkammer";
      unterkunft_application_status: "pending" | "approved" | "rejected";
      unterkunft_submission_status: "draft" | "pending" | "approved" | "rejected";
    };
    CompositeTypes: Record<string, never>;
  };
};
