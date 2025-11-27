import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import { loader } from '@monaco-editor/react';

loader.init().then((monaco) => {
  monaco.editor.defineTheme('repo-wizard-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#171717', // Neutral dark
      'editor.foreground': '#d4d4d4', // Neutral text
      'editor.lineHighlightBackground': '#262626', // Neutral highlight
      'editorGutter.background': '#171717',
      'editorCursor.foreground': '#facc15', // theme.colors.yellow[400]
      'diffEditor.insertedTextBackground': '#05966933', // theme.colors.green[600] with 20% opacity
      'diffEditor.removedTextBackground': '#e11d4833', // theme.colors.red[600] with 20% opacity
    },
  });
});

import { ThemeProvider } from 'next-themes';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider attribute="class">
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
