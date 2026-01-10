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


class Unterkunft(BaseModel):
    """
    Example schema aligned to `public.unterkuenfte` from:
    `supabase/migrations/20260109000001_init_warmebetten.sql`

    Notes for extraction:
    - Some DB columns are NOT NULL (e.g. lat/lng) but in PDFs they may be missing.
      We keep them optional here to avoid hallucinations; you can enforce NOT NULL later.
    """

    model_config = ConfigDict(extra="forbid")

    # location / display
    bezirk: BerlinBezirk | None = None
    name: str = Field(description="Name of the offer/shelter")
    adresse: str | None = Field(default=None, description="Full address as shown in the source")
    strasse: str | None = None

    u_bahn_station: str | None = None
    s_bahn_station: str | None = None
    bus: str | None = None

    # contact / public info
    telefon: str | None = None
    email: str | None = None
    website: str | None = None
    verantwortliche_personen: list[str] | None = None
    metadata: str | None = None

    # opening times (daily)
    oeffnung_von: time | None = None
    oeffnung_bis: time | None = None
    letzter_einlass: time | None = None

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

    # source of truth: free spots right now
    plaetze_frei_aktuell: int | None = Field(default=None, ge=0)


class UnterkuenfteExtraction(BaseModel):
    model_config = ConfigDict(extra="forbid")

    unterkuenfte: list[Unterkunft] = Field(default_factory=list)


