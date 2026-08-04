const fs = require('fs');
let code = fs.readFileSync('src/components/StatsTab.tsx', 'utf8');

code = code.replace(
  "  const rankedGroups = groupStats.map((g: any) => {",
  "  const rankedGroups = groupStats.map((g: any) => {"
);

const oldCode = `
  // Calculate ranks
  const sortedGroups = [...groupStats].sort((a, b) => b.totalPercentage - a.totalPercentage);
  const rankedGroups = groupStats.map((g: any) => {
    // Find rank (1-indexed), handling ties
    const rank = sortedGroups.findIndex((sg) => sg.totalPercentage === g.totalPercentage) + 1;
    return { ...g, rank };
  });
`;

const newCode = `
  // Calculate ranks
  const sortedGroups = [...groupStats].sort((a, b) => b.totalPercentage - a.totalPercentage);
  const rankedGroups = groupStats.map((g: any) => {
    // Find rank (1-indexed), handling ties
    const rank = sortedGroups.findIndex((sg) => sg.totalPercentage === g.totalPercentage) + 1;
    return { ...g, rank };
  }).sort((a, b) => a.rank - b.rank);
`;

code = code.replace(oldCode.trim(), newCode.trim());

fs.writeFileSync('src/components/StatsTab.tsx', code);
