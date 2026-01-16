/**
 * Code Preview Template System
 * Pre-configured templates for popular frameworks
 * Copyright © 2025 KilatCode Studio
 */

export interface CodeTemplate {
    name: string;
    framework: 'react' | 'react-ts' | 'vue' | 'nextjs' | 'vite-react-ts' | 'vanilla' | 'vanilla-ts';
    files: Record<string, string>;
    dependencies: Record<string, string>;
    description: string;
}

/**
 * React TypeScript template
 */
export const REACT_TS_TEMPLATE: CodeTemplate = {
    name: 'React TypeScript',
    framework: 'react-ts',
    description: 'React 18 with TypeScript and modern hooks',
    dependencies: {
        'react': '^18.2.0',
        'react-dom': '^18.2.0'
    },
    files: {
        '/App.tsx': `import React from 'react';
import './App.css';

export default function App() {
  const [count, setCount] = React.useState(0);

  return (
    <div className="App">
      <h1>Welcome to React + TypeScript</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}`,
        '/App.css': `.App {
  text-align: center;
  padding: 2rem;
  font-family: system-ui, sans-serif;
}

button {
  background: #3178c6;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
}

button:hover {
  background: #2563eb;
}`
    }
};

/**
 * Next.js template
 */
export const NEXTJS_TEMPLATE: CodeTemplate = {
    name: 'Next.js',
    framework: 'nextjs',
    description: 'Next.js 14 with App Router',
    dependencies: {
        'react': '^18.2.0',
        'react-dom': '^18.2.0',
        'next': '^14.0.0'
    },
    files: {
        '/app/page.tsx': `'use client';

import { useState } from 'react';
import styles from './page.module.css';

export default function Home() {
  const [count, setCount] = useState(0);

  return (
    <main className={styles.main}>
      <h1>Next.js App Router</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </main>
  );
}`,
        '/app/page.module.css': `.main {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  min-height: 100vh;
}

h1 {
  font-size: 2rem;
  margin-bottom: 1rem;
}

button {
  background: #0070f3;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
}`
    }
};

/**
 * Vanilla TypeScript template
 */
export const VANILLA_TS_TEMPLATE: CodeTemplate = {
    name: 'Vanilla TypeScript',
    framework: 'vanilla-ts',
    description: 'Plain TypeScript with no framework',
    dependencies: {
        'typescript': '^5.0.0'
    },
    files: {
        '/index.ts': `console.log('Hello from TypeScript!');

class Counter {
  private count: number = 0;

  increment(): void {
    this.count++;
    this.render();
  }

  render(): void {
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = \`
        <h1>TypeScript Counter</h1>
        <p>Count: \${this.count}</p>
        <button id="increment">Increment</button>
      \`;
      
      const btn = document.getElementById('increment');
      if (btn) {
        btn.addEventListener('click', () => this.increment());
      }
    }
  }
}

const counter = new Counter();
counter.render();`,
        '/index.html': `<!DOCTYPE html>
<html>
<head>
  <title>TypeScript App</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      padding: 2rem;
      text-align: center;
    }
    button {
      background: #3178c6;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 6px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div id="app"></div>
  <script src="/index.ts"></script>
</body>
</html>`
    }
};

/**
 * Vite + React TypeScript template
 */
export const VITE_REACT_TS_TEMPLATE: CodeTemplate = {
    name: 'Vite + React TS',
    framework: 'vite-react-ts',
    description: 'Vite with React and TypeScript',
    dependencies: {
        'react': '^18.2.0',
        'react-dom': '^18.2.0',
        'vite': '^5.0.0',
        '@vitejs/plugin-react': '^4.2.0'
    },
    files: {
        '/src/App.tsx': `import { useState } from 'react';
import './App.css';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="App">
      <h1>Vite + React + TypeScript</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
      </div>
    </div>
  );
}

export default App;`,
        '/src/App.css': `#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.card {
  padding: 2em;
}

button {
  background-color: #646cff;
  color: white;
  border: none;
  padding: 0.6em 1.2em;
  font-size: 1em;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.25s;
}

button:hover {
  background-color: #535bf2;
}`
    }
};

/**
 * Get template by name
 */
export function getTemplate(name: string): CodeTemplate | null {
    const templates: Record<string, CodeTemplate> = {
        'react-ts': REACT_TS_TEMPLATE,
        'nextjs': NEXTJS_TEMPLATE,
        'vanilla-ts': VANILLA_TS_TEMPLATE,
        'vite-react-ts': VITE_REACT_TS_TEMPLATE
    };

    return templates[name] || null;
}

/**
 * List all available templates
 */
export function getAllTemplates(): CodeTemplate[] {
    return [
        REACT_TS_TEMPLATE,
        NEXTJS_TEMPLATE,
        VITE_REACT_TS_TEMPLATE,
        VANILLA_TS_TEMPLATE
    ];
}

/**
 * Create custom template from files
 */
export function createCustomTemplate(
    name: string,
    framework: CodeTemplate['framework'],
    files: Record<string, string>,
    dependencies: Record<string, string> = {},
    description: string = 'Custom template'
): CodeTemplate {
    return {
        name,
        framework,
        files,
        dependencies,
        description
    };
}
