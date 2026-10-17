import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/playfair-display/400-italic.css';
import '@fontsource/playfair-display/600.css';
import '@fontsource/playfair-display/700.css';
import { initNativeShell } from './native-shell';
import { checkForUpdate } from './native-update';
import {createRoot} from 'react-dom/client';
import Root from './Root.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<Root />);
checkForUpdate();
initNativeShell();
