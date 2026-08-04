const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "import StatsTab from './components/StatsTab';",
  "import StatsTab from './components/StatsTab';\nimport MemberStatsTab from './components/MemberStatsTab';"
);

code = code.replace(
  "{(!isGuest || isGuest) && <TabButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')}>Thống kê</TabButton>}",
  "{(!isGuest || isGuest) && <TabButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')}>Thống kê Tổ</TabButton>}\n          {(!isGuest || isGuest) && <TabButton active={activeTab === 'member_stats'} onClick={() => setActiveTab('member_stats')}>Thống kê Cá nhân</TabButton>}"
);

code = code.replace(
  "{activeTab === 'stats' && <StatsTab />}",
  "{activeTab === 'stats' && <StatsTab />}\n          {activeTab === 'member_stats' && <MemberStatsTab />}"
);

fs.writeFileSync('src/App.tsx', code);
