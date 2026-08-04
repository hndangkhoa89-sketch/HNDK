sed -i '/<div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">/,$!b' src/components/AdminTab.tsx
# wait, there are two of them. We want to keep the first one, remove the second one.
