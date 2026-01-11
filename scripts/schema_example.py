from __future__ import annotations

from datetime import time
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class BerlinBezirk(str, Enum):
    """
    Mirrors enum `public.berlin_bezirk` in the SQL schema.
    """

    mitte = "mitte"
    friedrichshain_kreuzberg = "friedrichshain_kreuzberg"
    pankow = "pankow"
    charlottenburg_wilmersdorf = "charlottenburg_wilmersdorf"
    spandau = "spandau"
    steglitz_zehlendorf = "steglitz_zehlendorf"
    tempelhof_schoeneberg = "tempelhof_schoeneberg"
    neukoelln = "neukoelln"
    treptow_koepenick = "treptow_koepenick"
    marzahn_hellersdorf = "marzahn_hellersdorf"
    lichtenberg = "lichtenberg"
    reinickendorf = "reinickendorf"


class UnterkunftTyp(str, Enum):
    """
    Mirrors enum `public.unterkunft_typ` from migration:
    `supabase/migrations/20260110000003_add_unterkunft_typ.sql`
    """

    notuebernachtung = "notuebernachtung"
    nachtcafe = "nachtcafe"
    tagesangebote = "tagesangebote"
    essen_verpflegung = "essen_verpflegung"
    medizinische_hilfen = "medizinische_hilfen"
    suchtangebote = "suchtangebote"
    beratung = "beratung"
    hygiene = "hygiene"
    kleiderkammer = "kleiderkammer"


class Unterkunft(BaseModel):
    """
    Extraction schema (LLM output) aligned to the **content columns** of `public.unterkuenfte`.

    Current SQL shape comes from:
    - `supabase/migrations/20260109000001_init_warmebetten.sql`
    - `supabase/migrations/20260110000002_unterkunft_register_tables_and_nullable_coords.sql` (lat/lng nullable)
    - `supabase/migrations/20260110000003_add_unterkunft_typ.sql` (adds `typ`)

    Notes for extraction:
    - We keep many fields nullable to avoid hallucinations. The DB has defaults/NOT NULL
      constraints; you can map null -> defaults at insert time.
    """

    model_config = ConfigDict(extra="forbid")

    # location / display
    bezirk: BerlinBezirk | None = None
    typ: UnterkunftTyp | None = None
    name: str = Field(description="Name of the offer/shelter")
    adresse: str = Field(description="Full address as shown in the source")
    strasse: str | None = None

    u_bahn_station: str | None = None
    s_bahn_station: str | None = None
    bus: str | None = None

    # contact / public info
    telefon: list[str] | None = None
    email: list[str] | None = None
    website: str | None = None
    verantwortliche_personen: list[str] | None = None
    metadata: str | None = None

    # opening times (daily)
    oeffnung_von: time | None = None
    oeffnung_bis: time | None = None
    letzter_einlass: time | None = None
    general_opening_hours: str | None = None

    # kälte-/wärmebus can come between...
    kaelte_waerme_bus_kann_kommen_von: time | None = None
    kaelte_waerme_bus_kann_kommen_bis: time | None = None

    # rules
    keine_drogen: bool | None = None
    keine_tiere: bool | None = None
    keine_gewalt: bool | None = None

    # offers/services
    bietet_dusche: bool | None = None
    bietet_essen: bool | None = None
    bietet_betreuung: bool | None = None
    bietet_kleidung: bool | None = None
    bietet_medizin: bool | None = None
    behindertengerecht: bool | None = None

    # capacities (max)
    kapazitaet_max_allgemein: int | None = Field(default=None, ge=0)
    kapazitaet_max_frauen: int | None = Field(default=None, ge=0)
    kapazitaet_max_maenner: int | None = Field(default=None, ge=0)


class UnterkuenfteExtraction(BaseModel):
    model_config = ConfigDict(extra="forbid")

    unterkuenfte: list[Unterkunft] = Field(default_factory=list)


