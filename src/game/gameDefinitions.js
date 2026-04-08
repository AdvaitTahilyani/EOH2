export const gameDefinitions = [
  {
    id: "speed",
    shortLabel: "Speed",
    title: "Turbo Tap Lines",
    description:
      "Keep three conveyor lanes moving by tapping at the right moment as glowing packets reach the timing gates.",
    instructions:
      "Tap the matching lane when a packet lands inside the bright timing zone. Build combos for a faster line.",
    metric: "Clock Performance",
    duration: 35,
    durationLabel: "35s round",
    maxScore: 5600,
    linkText:
      "faster, cleaner timing means more work can move through the chip every second.",
  },
  {
    id: "power",
    shortLabel: "Efficiency",
    title: "Power Budget Rush",
    description:
      "Catch falling energy sparks in the right lanes and feed the battery without overloading the chip.",
    instructions:
      "Move left and right to catch green sparks, avoid red overload sparks, and keep the battery in the safe zone for combo points.",
    metric: "Power Efficiency",
    duration: 30,
    durationLabel: "30s round",
    maxScore: 5200,
    linkText:
      "good chip design is not only fast, it gets that speed without wasting energy.",
  },
  {
    id: "thermal",
    shortLabel: "Cooling",
    title: "Cool It Fast",
    description:
      "Hotspots ignite across the chip floor. Each one must be cooled before its timer expires or it burns out permanently.",
    instructions:
      "Click only live hotspots. Burned-out cells lock forever and cost points, so prioritize the ones closest to overheating.",
    metric: "Thermal Control",
    duration: 32,
    durationLabel: "32s round",
    maxScore: 6200,
    linkText:
      "real chips must stay cool enough to keep running smoothly at high performance.",
  },
  {
    id: "cores",
    shortLabel: "Parallelism",
    title: "Core Crew Dispatch",
    description:
      "Drag incoming tasks onto the matching machine by size before the queue backs up and the factory jams.",
    instructions:
      "Match the task number only. Tasks now spawn faster and backlog penalties hit harder, so clean scheduling matters.",
    metric: "Core Utilization",
    duration: 35,
    durationLabel: "35s round",
    maxScore: 4600,
    linkText:
      "multiple cores help a chip handle many jobs at once when the work is split well.",
  },
  {
    id: "routing",
    shortLabel: "Routing",
    title: "Trace Maze Sprint",
    description:
      "Draw fast signal paths across several short routing boards while dodging noisy interference clouds and long detours.",
    instructions:
      "Complete several routes from START to END. Short clean paths score best, and each finished board advances to the next round.",
    metric: "Signal Integrity",
    duration: null,
    durationLabel: "3 boards",
    maxScore: 4200,
    linkText:
      "shorter, cleaner routes help information travel across a chip with fewer delays and errors.",
  },
];

export const totalPossibleScore = gameDefinitions.length * 100;

export function normalizeScore(rawScore, maxScore) {
  return Math.max(0, Math.min(100, Math.round((rawScore / maxScore) * 100)));
}

export function medalForScore(normalized) {
  if (normalized >= 90) return "Legend";
  if (normalized >= 75) return "Elite";
  if (normalized >= 55) return "Skilled";
  return "Rookie";
}
