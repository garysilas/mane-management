import { parseTimeToMinutes } from "@/lib/utils/time";

type RuleRange = {
  startTimeLocal: string;
  endTimeLocal: string;
};

function overlaps(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && endA > startB;
}

export function hasAvailabilityRuleOverlap(
  proposedRule: RuleRange,
  existingRules: RuleRange[],
): boolean {
  const proposedStart = parseTimeToMinutes(proposedRule.startTimeLocal);
  const proposedEnd = parseTimeToMinutes(proposedRule.endTimeLocal);

  return existingRules.some((existingRule) => {
    const existingStart = parseTimeToMinutes(existingRule.startTimeLocal);
    const existingEnd = parseTimeToMinutes(existingRule.endTimeLocal);

    return overlaps(proposedStart, proposedEnd, existingStart, existingEnd);
  });
}
