const fs = require('fs');
let settings = fs.readFileSync('src/components/SettingsView.tsx', 'utf8');

settings = settings.replace(
  "import { useTheme, ThemeType } from './ThemeProvider';",
  "import { useTheme, ThemeType } from './ThemeProvider';\nimport { useAmbientSound, AmbientSoundType } from '../hooks/useAmbientSound';\nimport { Headphones, Volume2 } from 'lucide-react';"
);

fs.writeFileSync('src/components/SettingsView.tsx', settings);
