sed -i 's/const text = presentCount > 0 ? `${presentCount}\/${totalCount} (${percentage}%)` : '\''-'\'';/const text = `${presentCount}\/${totalCount} (${percentage}%)`;/g' src/components/StatsTab.tsx
sed -i 's/{stats.count > 0 ? (/{stats.text !== '\''-'\'' ? (/g' src/components/StatsTab.tsx
