export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      unterkuenfte: {
        Row: {
          adresse: string | null
          behindertengerecht: boolean
          betten_frei: boolean | null
          bezirk: Database["public"]["Enums"]["berlin_bezirk"] | null
          bietet_betreuung: boolean
          bietet_dusche: boolean
          bietet_essen: boolean
          bietet_kleidung: boolean
          bietet_medizin: boolean
          bus: string | null
          capacity_updated_at: string
          created_at: string
          created_by: string | null
          email: string[] | null
          id: string
          is_mobile: boolean
          kaelte_waerme_bus_kann_kommen_bis: string | null
          kaelte_waerme_bus_kann_kommen_von: string | null
          kapazitaet_belegt: number | null
          kapazitaet_max_allgemein: number
          kapazitaet_max_frauen: number
          kapazitaet_max_maenner: number
          keine_drogen: boolean
          keine_gewalt: boolean
          keine_tiere: boolean
          lat: number | null
          letzter_einlass: string | null
          lng: number | null
          general_opening_hours: string | null
          metadata: string | null
          name: string
          oeffnung_bis: string | null
          oeffnung_von: string | null
          owner_user_id: string | null
          plaetze_frei: number | null
          plaetze_frei_aktuell: number
          s_bahn_station: string | null
          strasse: string | null
          telefon: string[] | null
          typ: Database["public"]["Enums"]["unterkunft_typ"] | null
          u_bahn_station: string | null
          updated_at: string
          verantwortliche_personen: string[]
          website: string | null
        }
        Insert: {
          adresse?: string | null
          behindertengerecht?: boolean
          betten_frei?: boolean | null
          bezirk?: Database["public"]["Enums"]["berlin_bezirk"] | null
          bietet_betreuung?: boolean
          bietet_dusche?: boolean
          bietet_essen?: boolean
          bietet_kleidung?: boolean
          bietet_medizin?: boolean
          bus?: string | null
          capacity_updated_at?: string
          created_at?: string
          created_by?: string | null
          email?: string[] | null
          id?: string
          is_mobile?: boolean
          kaelte_waerme_bus_kann_kommen_bis?: string | null
          kaelte_waerme_bus_kann_kommen_von?: string | null
          kapazitaet_belegt?: number | null
          kapazitaet_max_allgemein?: number
          kapazitaet_max_frauen?: number
          kapazitaet_max_maenner?: number
          keine_drogen?: boolean
          keine_gewalt?: boolean
          keine_tiere?: boolean
          lat?: number | null
          letzter_einlass?: string | null
          lng?: number | null
          general_opening_hours?: string | null
          metadata?: string | null
          name: string
          oeffnung_bis?: string | null
          oeffnung_von?: string | null
          owner_user_id?: string | null
          plaetze_frei?: number | null
          plaetze_frei_aktuell?: number
          s_bahn_station?: string | null
          strasse?: string | null
          telefon?: string[] | null
          typ?: Database["public"]["Enums"]["unterkunft_typ"] | null
          u_bahn_station?: string | null
          updated_at?: string
          verantwortliche_personen?: string[]
          website?: string | null
        }
        Update: {
          adresse?: string | null
          behindertengerecht?: boolean
          betten_frei?: boolean | null
          bezirk?: Database["public"]["Enums"]["berlin_bezirk"] | null
          bietet_betreuung?: boolean
          bietet_dusche?: boolean
          bietet_essen?: boolean
          bietet_kleidung?: boolean
          bietet_medizin?: boolean
          bus?: string | null
          capacity_updated_at?: string
          created_at?: string
          created_by?: string | null
          email?: string[] | null
          id?: string
          is_mobile?: boolean
          kaelte_waerme_bus_kann_kommen_bis?: string | null
          kaelte_waerme_bus_kann_kommen_von?: string | null
          kapazitaet_belegt?: number | null
          kapazitaet_max_allgemein?: number
          kapazitaet_max_frauen?: number
          kapazitaet_max_maenner?: number
          keine_drogen?: boolean
          keine_gewalt?: boolean
          keine_tiere?: boolean
          lat?: number | null
          letzter_einlass?: string | null
          lng?: number | null
          general_opening_hours?: string | null
          metadata?: string | null
          name?: string
          oeffnung_bis?: string | null
          oeffnung_von?: string | null
          owner_user_id?: string | null
          plaetze_frei?: number | null
          plaetze_frei_aktuell?: number
          s_bahn_station?: string | null
          strasse?: string | null
          telefon?: string[] | null
          typ?: Database["public"]["Enums"]["unterkunft_typ"] | null
          u_bahn_station?: string | null
          updated_at?: string
          verantwortliche_personen?: string[]
          website?: string | null
        }
        Relationships: []
      }
      unterkunft_applications: {
        Row: {
          admin_note: string | null
          created_at: string
          email: string
          id: string
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          status: Database["public"]["Enums"]["unterkunft_application_status"]
          unterkunft_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          email: string
          id?: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: Database["public"]["Enums"]["unterkunft_application_status"]
          unterkunft_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          email?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: Database["public"]["Enums"]["unterkunft_application_status"]
          unterkunft_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unterkunft_applications_unterkunft_id_fkey"
            columns: ["unterkunft_id"]
            isOneToOne: false
            referencedRelation: "unterkuenfte"
            referencedColumns: ["id"]
          },
        ]
      }
      unterkunft_email_whitelist: {
        Row: {
          created_at: string
          email: string
          id: string
          unterkunft_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          unterkunft_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          unterkunft_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unterkunft_email_whitelist_unterkunft_id_fkey"
            columns: ["unterkunft_id"]
            isOneToOne: false
            referencedRelation: "unterkuenfte"
            referencedColumns: ["id"]
          },
        ]
      }
      unterkunft_submissions: {
        Row: {
          admin_note: string | null
          created_at: string
          email: string
          id: string
          payload: Json
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          status: Database["public"]["Enums"]["unterkunft_submission_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          email: string
          id?: string
          payload: Json
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: Database["public"]["Enums"]["unterkunft_submission_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          email?: string
          id?: string
          payload?: Json
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: Database["public"]["Enums"]["unterkunft_submission_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
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
        | "reinickendorf"
      unterkunft_application_status: "pending" | "approved" | "rejected"
      unterkunft_submission_status:
        | "draft"
        | "pending"
        | "approved"
        | "rejected"
      unterkunft_typ:
        | "notuebernachtung"
        | "nachtcafe"
        | "tagesangebote"
        | "essen_verpflegung"
        | "medizinische_hilfen"
        | "suchtangebote"
        | "beratung"
        | "hygiene"
        | "kleiderkammer"
      user_role: "public" | "provider" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      berlin_bezirk: [
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
      ],
      unterkunft_application_status: ["pending", "approved", "rejected"],
      unterkunft_submission_status: [
        "draft",
        "pending",
        "approved",
        "rejected",
      ],
      unterkunft_typ: [
        "notuebernachtung",
        "nachtcafe",
        "tagesangebote",
        "essen_verpflegung",
        "medizinische_hilfen",
        "suchtangebote",
        "beratung",
        "hygiene",
        "kleiderkammer",
      ],
      user_role: ["public", "provider", "admin"],
    },
  },
} as const
