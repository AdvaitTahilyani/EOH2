export const gameDefinitions = [
  {
    id: "speed",
    shortLabel: "Wafer Probe",
    title: "Wafer Probe Test",
    description:
      "Validate probe-station throughput by keeping three test lanes synchronized as packets reach timing gates.",
    instructions:
      "Trigger the matching lane as packets enter the timing window. Consistent timing raises throughput and score.",
    metric: "Probe Throughput",
    duration: 35,
    durationLabel: "35s round",
    previewVideo: "/videos/speed-preview.mp4",
    maxScore: 5600,
    linkText:
      "faster, cleaner timing means more work can move through the chip every second.",
  },
  {
    id: "power",
    shortLabel: "Power",
    title: "Power Integrity Test",
    description:
      "Run dynamic power integrity checks by balancing charge events without pushing the die into overload.",
    instructions:
      "Catch valid (green) events, avoid overload (red) events, and hold the battery in the safe operating window.",
    metric: "Power Stability",
    duration: 30,
    durationLabel: "30s round",
    previewVideo: "/videos/power-preview.mp4",
    maxScore: 5200,
    linkText:
      "good chip design is not only fast, it gets that speed without wasting energy.",
  },
  {
    id: "thermal",
    shortLabel: "Thermal",
    title: "Thermal Stress Test",
    description:
      "Screen thermal reliability by clearing active hotspots before they exceed safe temperature limits.",
    instructions:
      "Clear active hotspots before timeout. Burned-out cells lock and reduce reliability score.",
    metric: "Thermal Control",
    duration: 32,
    durationLabel: "32s round",
    previewVideo: "/videos/thermal-preview.mp4",
    maxScore: 6200,
    linkText:
      "real chips must stay cool enough to keep running smoothly at high performance.",
  },
  {
    id: "cores",
    shortLabel: "Compute",
    title: "Core Load Test",
    description:
      "Validate parallel compute behavior by dispatching workloads to matching core groups under queue pressure.",
    instructions:
      "Route each workload to the matching core target. Queue backlog and misroutes reduce performance.",
    metric: "Core Utilization",
    duration: 35,
    durationLabel: "35s round",
    previewVideo: "/videos/cores-preview.mp4",
    maxScore: 4600,
    linkText:
      "multiple cores help a chip handle many jobs at once when the work is split well.",
  },
  {
    id: "routing",
    shortLabel: "Signal",
    title: "Signal Routing Test",
    description:
      "Run 30-second signal integrity routing checks by drawing clean paths while avoiding interference zones.",
    instructions:
      "Complete as many START-to-END routes as possible in 30 seconds. Short paths with fewer hazard contacts score best.",
    metric: "Signal Integrity",
    duration: 30,
    durationLabel: "30s endless",
    previewVideo: "/videos/routing-preview.mp4",
    maxScore: 4200,
    linkText:
      "shorter, cleaner routes help information travel across a chip with fewer delays and errors.",
  },
];

export const difficultyLevels = [
  {
    id: "easy",
    label: "Easy",
    description: "Slower patterns, lighter penalties, lower score thresholds.",
    scoreMultiplier: 0.78,
  },
  {
    id: "medium",
    label: "Medium",
    description: "Current baseline balancing.",
    scoreMultiplier: 1,
  },
  {
    id: "hard",
    label: "Hard",
    description: "Faster pacing, tighter windows, harsher penalties, higher score thresholds.",
    scoreMultiplier: 1.26,
  },
];

export function normalizeScore(rawScore, maxScore) {
  return Math.max(0, Math.round((rawScore / maxScore) * 100));
}

export function medalForScore(normalized) {
  if (normalized >= 130) return "Legend";
  if (normalized >= 100) return "Elite";
  if (normalized >= 70) return "Skilled";
  return "Rookie";
}
