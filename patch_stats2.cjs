const fs = require('fs');
let code = fs.readFileSync('src/components/StatsTab.tsx', 'utf8');

const rankStyles = `
                    <span className={\`inline-flex items-center justify-center rounded-full \${
                      g.rank === 1 
                        ? 'w-8 h-8 bg-gradient-to-br from-yellow-300 to-amber-500 text-amber-950 font-black shadow-md border border-yellow-400 text-base' 
                        : g.rank === 2 
                        ? 'w-7 h-7 bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900 font-bold shadow border border-slate-300 text-sm' 
                        : g.rank === 3 
                        ? 'w-7 h-7 bg-gradient-to-br from-orange-300 to-red-400 text-red-950 font-bold shadow border border-orange-400 text-sm' 
                        : 'w-6 h-6 bg-slate-100 text-slate-600 font-semibold border border-slate-200 text-xs'
                    }\`}>
`;

code = code.replace(/<span className={\`inline-flex items-center justify-center w-6 h-6 rounded-full.*?\`}>/, rankStyles.trim());

fs.writeFileSync('src/components/StatsTab.tsx', code);
