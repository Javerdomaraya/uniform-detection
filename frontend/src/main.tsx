import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Suppress deprecated DOM mutation event warnings from Radix UI
// These will be fixed by Radix before Chrome 127 removes the events
// Also suppress accessibility warnings for DialogTitle and Description
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args) => {
  if (
    typeof args[0] === 'string' && 
    (args[0].includes('DOMNodeInserted') || 
     args[0].includes('DOMNodeRemoved') ||
     args[0].includes('DOMNodeInsertedIntoDocument') ||
     args[0].includes('DOMSubtreeModified') ||
     args[0].includes('DOMCharacterDataModified') ||
     args[0].includes('DOM Mutation Event') ||
     args[0].includes('DialogTitle') ||
     args[0].includes('DialogContent'))
  ) {
    return; // Suppress the warning
  }
  originalError.apply(console, args);
};

console.warn = (...args) => {
  if (
    typeof args[0] === 'string' && 
    (args[0].includes('DOMNodeInserted') || 
     args[0].includes('DOMNodeRemoved') ||
     args[0].includes('DOMNodeInsertedIntoDocument') ||
     args[0].includes('DOMSubtreeModified') ||
     args[0].includes('DOMCharacterDataModified') ||
     args[0].includes('DOM Mutation Event') ||
     args[0].includes('Description') ||
     args[0].includes('aria-describedby'))
  ) {
    return; // Suppress the warning
  }
  originalWarn.apply(console, args);
};

createRoot(document.getElementById("root")!).render(<App />);
