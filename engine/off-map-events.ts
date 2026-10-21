import prisma from "@/lib/prisma";
import { EventScope, FactionType } from "@prisma/client";
import { recordAndReconcileEvent } from "./events/reconciler";

export interface OffMapTheaterState {
  europeTheater: {
    name: string;
    status: string;
    britishSubsidyDrain: number;
    frenchContinentalDrain: number;
    germanSubsidyInflow: number;
    spanishBourbonTension: number;
    royalNavyBlockadeModifier: number;
    narrative: string;
  };
  indiaTheater: {
    name: string;
    status: string;
    britishEastIndiaRevenue: number;
    frenchCompagnieRevenue: number;
    narrative: string;
  };
  westAfricaTheater: {
    name: string;
    status: string;
    caribbeanLaborSupplyModifier: number;
    dutchNeutralFreightBonus: number;
    portugueseSouthAtlanticBonus: number;
    narrative: string;
  };
}

interface HistoricalOffMapPulse {
  europeStatus: string;
  europeNarrative: string;
  gbEuropeDrain: number;
  frEuropeDrain: number;
  germanInflow: number;
  indiaStatus: string;
  indiaNarrative: string;
  gbIndiaBonus: number;
  frIndiaBonus: number;
  westAfricaNarrative: string;
  dutchBonus: number;
  portugalBonus: number;
}

const HISTORICAL_OFF_MAP_PULSES: Record<number, HistoricalOffMapPulse> = {
  1: {
    europeStatus: "SIEGE_OF_MINORCA_AND_SAXONY_INVASION",
    europeNarrative:
      "Marshal Richelieu takes Minorca while Frederick II invades Saxony; Whitehall dispatches bullion subsidies to Berlin and Hanover.",
    gbEuropeDrain: 20,
    frEuropeDrain: 24,
    germanInflow: 22,
    indiaStatus: "CALCUTTA_AND_CARNATIC_MOBILIZATION",
    indiaNarrative:
      "East India Company and Compagnie des Indes reinforce Madras and Pondicherry squadrons.",
    gbIndiaBonus: 14,
    frIndiaBonus: 12,
    westAfricaNarrative:
      "Dutch and Portuguese merchantmen profit from neutral freight surges across the Mid-Atlantic.",
    dutchBonus: 14,
    portugalBonus: 10,
  },
  2: {
    europeStatus: "CONVENTION_OF_WESTMINSTER_SUBSIDIES",
    europeNarrative:
      "Continental war escalates in Bohemia; France commits vast field armies to Germany, diverting dockyard timber from Brest and Toulon.",
    gbEuropeDrain: 22,
    frEuropeDrain: 30,
    germanInflow: 25,
    indiaStatus: "BENGAL_EXPEDITION_UNFOLDING",
    indiaNarrative:
      "Clive and Watson recapture Calcutta; EIC customs remittances bolster London's credit.",
    gbIndiaBonus: 20,
    frIndiaBonus: 9,
    westAfricaNarrative:
      "Royal Navy sloops raid French gum factories at Senegal, tightening Caribbean supply.",
    dutchBonus: 15,
    portugalBonus: 11,
  },
  3: {
    europeStatus: "ROSSBACH_AND_LEUTHEN_SHOCKWAVES",
    europeNarrative:
      "Prussian victories at Rossbach and Leuthen force Versailles to double continental subsidies, straining New France relief convoys.",
    gbEuropeDrain: 25,
    frEuropeDrain: 35,
    germanInflow: 28,
    indiaStatus: "POST_PLASSEY_BENGAL_BULLION_INFLOW",
    indiaNarrative:
      "Bengal treasury inflows strengthen British sovereign credit while Pondicherry faces naval blockade.",
    gbIndiaBonus: 26,
    frIndiaBonus: 6,
    westAfricaNarrative:
      "Capture of Gorée and Senegal factories shifts Atlantic trade premiums toward British and Dutch hulls.",
    dutchBonus: 16,
    portugalBonus: 12,
  },
};

export async function applyOffMapTheaterModifiers(gameId: string) {
  const game = await prisma.game.findUniqueOrThrow({
    where: { id: gameId },
    include: { factions: true },
  });

  const pulse =
    HISTORICAL_OFF_MAP_PULSES[game.turnNumber] ??
    HISTORICAL_OFF_MAP_PULSES[3];

  const nextOffMapState: OffMapTheaterState = {
    europeTheater: {
      name: "Continental European Theater (Bohemia, Hanover & Minorca)",
      status: pulse.europeStatus,
      britishSubsidyDrain: pulse.gbEuropeDrain,
      frenchContinentalDrain: pulse.frEuropeDrain,
      germanSubsidyInflow: pulse.germanInflow,
      spanishBourbonTension: game.turnNumber >= 3 ? 15 : 5,
      royalNavyBlockadeModifier: 1.15 + game.turnNumber * 0.03,
      narrative: pulse.europeNarrative,
    },
    indiaTheater: {
      name: "East Indies & Carnatic Theater (Bengal & Coromandel)",
      status: pulse.indiaStatus,
      britishEastIndiaRevenue: pulse.gbIndiaBonus,
      frenchCompagnieRevenue: pulse.frIndiaBonus,
      narrative: pulse.indiaNarrative,
    },
    westAfricaTheater: {
      name: "West African Coast (Senegal & Gorée)",
      status: "ATLANTIC_FACTORY_COMPETITION",
      caribbeanLaborSupplyModifier: 1.0,
      dutchNeutralFreightBonus: pulse.dutchBonus,
      portugueseSouthAtlanticBonus: pulse.portugalBonus,
      narrative: pulse.westAfricaNarrative,
    },
  };

  await prisma.game.update({
    where: { id: gameId },
    data: {
      offMapModifiers: nextOffMapState as any,
    },
  });

  const ledgerAdjustments: Array<{
    factionId: string;
    factionType: FactionType;
    treasuryDelta: number;
    debtDelta: number;
    unrestDelta: number;
  }> = [];

  for (const faction of game.factions) {
    let treasuryDelta = 0;
    let debtDelta = 0;
    let unrestDelta = 0;

    switch (faction.type) {
      case FactionType.GREAT_BRITAIN:
        // EIC Bengal/Carnatic revenue minus Prussian/Hanoverian continental subsidy drain
        treasuryDelta = pulse.gbIndiaBonus - pulse.gbEuropeDrain;
        debtDelta = 10; // Pitt's funded national debt expansion
        break;
      case FactionType.FRANCE:
        // Compagnie des Indes revenue minus heavy continental German war drain
        treasuryDelta = pulse.frIndiaBonus - pulse.frEuropeDrain;
        debtDelta = 15;
        unrestDelta = 2;
        break;
      case FactionType.GERMAN_STATES:
        treasuryDelta = pulse.germanInflow;
        break;
      case FactionType.DUTCH_REPUBLIC:
        treasuryDelta = pulse.dutchBonus;
        break;
      case FactionType.PORTUGAL:
        treasuryDelta = pulse.portugalBonus;
        break;
      case FactionType.SPAIN:
        treasuryDelta = 12; // Manila & Veracruz trans-oceanic bullion reserve
        break;
      default:
        treasuryDelta = 5; // Indigenous confederacy interior peltry & gift circulation
        break;
    }

    const nextTreasury = Math.max(0, faction.treasury + treasuryDelta);
    const nextDebt = Math.max(
      0,
      faction.debt +
        debtDelta +
        (faction.treasury + treasuryDelta < 0
          ? Math.abs(faction.treasury + treasuryDelta)
          : 0)
    );
    const nextUnrest = Math.max(
      0,
      Math.min(100, faction.unrestIndex + unrestDelta)
    );

    await prisma.faction.update({
      where: { id: faction.id },
      data: {
        treasury: nextTreasury,
        debt: nextDebt,
        unrestIndex: nextUnrest,
      },
    });

    ledgerAdjustments.push({
      factionId: faction.id,
      factionType: faction.type,
      treasuryDelta,
      debtDelta,
      unrestDelta,
    });
  }

  const affectedFactionIds = game.factions
    .filter((f) =>
      (
        [
          FactionType.GREAT_BRITAIN,
          FactionType.FRANCE,
          FactionType.GERMAN_STATES,
          FactionType.DUTCH_REPUBLIC,
        ] as FactionType[]
      ).includes(f.type)
    )
    .map((f) => f.id);

  const recordedEvent = await recordAndReconcileEvent({
    gameId,
    turn: game.turnNumber,
    category: "COMMERCE",
    scope: EventScope.GLOBAL,
    factionIds: affectedFactionIds,
    title: `Off-Map Theater Ledger Pulse (Turn ${game.turnNumber}: Europe & India)`,
    description: `${pulse.europeNarrative} ${pulse.indiaNarrative}`,
    validUntilTurn: game.turnNumber + 2,
  });

  return {
    offMapState: nextOffMapState,
    ledgerAdjustments,
    recordedEventId: recordedEvent.id,
  };
}
