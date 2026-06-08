const fs = require('fs');
let settings = fs.readFileSync('src/components/SettingsView.tsx', 'utf8');

settings = settings.replace(
  "import { useTheme } from '../context/ThemeContext';",
  "import { useTheme } from '../context/ThemeContext';\nimport { useAmbientSound, AmbientSoundType } from '../hooks/useAmbientSound';\nimport { Headphones, Volume2 } from 'lucide-react';"
);

// Add the hook instantiation
settings = settings.replace(
  "const { isDevMode, toggleDevMode } = useDeveloperMode();",
  "const { isDevMode, toggleDevMode } = useDeveloperMode();\n  const { activeSound, setActiveSound, volume, setVolume } = useAmbientSound();"
);

// Add the Audio section inside the tab logic
// Or just below Theme? Yes, in Preferences tab.
const themeEndRe = `                     </div>
                   </div>
                 </div>

                 <hr className="border-gray-100" />

                 {/* Advanced */}`;

const audioSection = `                     </div>
                   </div>
                 </div>

                 <hr className="border-gray-100" />
                 
                 {/* Audio Settings */}
                 <div>
                   <label className="block text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                     <Headphones className="w-4 h-4" />
                     <span>Ambient Focus Sounds</span>
                   </label>
                   
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                     {(['none', 'coffee', 'rain', 'whitenoise'] as AmbientSoundType[]).map(type => (
                       <button
                         key={type}
                         onClick={() => setActiveSound(type)}
                         className={\`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 \${activeSound === type ? 'border-blue-600 bg-blue-50/30' : 'border-gray-200 hover:border-gray-300'}\`}
                       >
                         <div className={\`w-8 h-8 rounded-full flex items-center justify-center \${activeSound === type ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}\`}>
                           {type === 'none' && <Volume2 className="w-4 h-4" />}
                           {type === 'coffee' && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>}
                           {type === 'rain' && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
                           {type === 'whitenoise' && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M12 12a1 1 0 100-2 1 1 0 000 2z" /></svg>}
                         </div>
                         <span className="text-sm font-bold capitalize">{type === 'none' ? 'Off' : type === 'coffee' ? 'Coffee Shop' : type}</span>
                       </button>
                     ))}
                   </div>
                   
                   {activeSound !== 'none' && (
                     <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                       <Volume2 className="w-5 h-5 text-gray-500" />
                       <input 
                         type="range" 
                         min="0" 
                         max="1" 
                         step="0.05" 
                         value={volume}
                         onChange={(e) => setVolume(parseFloat(e.target.value))}
                         className="flex-1 accent-blue-600"
                       />
                       <span className="text-sm font-medium text-gray-600 w-12 text-right">{Math.round(volume * 100)}%</span>
                     </div>
                   )}
                 </div>

                 <hr className="border-gray-100" />

                 {/* Advanced */}`;

settings = settings.replace(themeEndRe, audioSection);
fs.writeFileSync('src/components/SettingsView.tsx', settings);
