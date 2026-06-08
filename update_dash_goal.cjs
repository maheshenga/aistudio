const fs = require('fs');
let dash = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

dash = dash.replace(
  "import { TimeSpentChart } from './TimeSpentChart';",
  "import { TimeSpentChart } from './TimeSpentChart';\nimport { DailyFocusGoal } from './DailyFocusGoal';"
);

const insertionPoint = `{/* 24/7 System Core Banner */}`;

dash = dash.replace(
  insertionPoint,
  `<DailyFocusGoal />\n      \n      {/* 24/7 System Core Banner */}`
);

fs.writeFileSync('src/components/Dashboard.tsx', dash);
