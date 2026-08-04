const fs = require('fs');
let code = fs.readFileSync('src/components/StatsTab.tsx', 'utf8');

const oldStyle = `                      g.rank === 1 \n                        ? 'w-8 h-8 bg-gradient-to-br from-yellow-300 to-amber-500 text-amber-950 font-black shadow-md border border-yellow-400 text-base' \n                        : g.rank === 2 \n                        ? 'w-7 h-7 bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900 font-bold shadow border border-slate-300 text-sm' \n                        : g.rank === 3 \n                        ? 'w-7 h-7 bg-gradient-to-br from-orange-300 to-red-400 text-red-950 font-bold shadow border border-orange-400 text-sm' \n                        : 'w-6 h-6 bg-slate-100 text-slate-600 font-semibold border border-slate-200 text-xs'`;

const newStyle = `                      g.rank === 1 \n                        ? 'w-8 h-8 bg-gradient-to-br from-yellow-300 to-amber-500 text-amber-950 font-black shadow-md border border-yellow-400 text-base' \n                        : g.rank === 2 \n                        ? 'w-7 h-7 bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900 font-bold shadow border border-slate-300 text-sm' \n                        : g.rank === 3 \n                        ? 'w-7 h-7 bg-gradient-to-br from-orange-300 to-red-400 text-red-950 font-bold shadow border border-orange-400 text-sm' \n                        : g.rank <= 6\n                        ? 'w-6 h-6 bg-blue-100 text-blue-700 font-bold border border-blue-200 text-xs shadow-sm'\n                        : 'w-6 h-6 bg-slate-100 text-slate-600 font-semibold border border-slate-200 text-xs'`;

code = code.replace(oldStyle, newStyle);
fs.writeFileSync('src/components/StatsTab.tsx', code);
