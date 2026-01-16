// Agent Data for KilatOS Platform
// All agents with "Kilat" branding

export interface Agent {
    id: string;
    name: string;
    displayName: string;
    icon: string;
    color: string;
    colorHex: string;
    category: 'DEV' | 'DATA' | 'EDU' | 'NLP' | 'SEC' | 'BIZ' | 'R&D' | 'DES' | 'QA';
    version: string;
    description: string;
    features: string[];
    endpoint: string;
}

export const agents: Agent[] = [
    {
        id: 'solve',
        name: 'KilatSolve',
        displayName: 'Kilat Solve',
        icon: 'psychology',
        color: 'indigo',
        colorHex: '#6366f1',
        category: 'R&D',
        version: '2.4.0',
        description: 'Advanced problem-solving agent using perplexity reasoning with real-time web search integration and citation tracking.',
        features: [
            'Multi-step problem decomposition',
            'Real-time web search',
            'Citation tracking',
            'Step-by-step explanations'
        ],
        endpoint: '/api/solve'
    },
    {
        id: 'question',
        name: 'KilatQuestion',
        displayName: 'Kilat Question',
        icon: 'help',
        color: 'purple',
        colorHex: '#a855f7',
        category: 'EDU',
        version: '2.1.0',
        description: 'Generates contextual questions for learning with custom and teacher-mimic modes for personalized education.',
        features: [
            'Custom question generation',
            'Teacher style mimicry',
            'Adaptive difficulty',
            'Multiple question types'
        ],
        endpoint: '/api/question'
    },
    {
        id: 'research',
        name: 'KilatResearch',
        displayName: 'Kilat Research',
        icon: 'search',
        color: 'teal',
        colorHex: '#14b8a6',
        category: 'R&D',
        version: '1.8.2',
        description: 'Deep research agent using Dynamic Retrieval in Knowledge Graphs for comprehensive information synthesis.',
        features: [
            'Knowledge graph traversal',
            'Multi-source synthesis',
            'Citation management',
            'Structured reports'
        ],
        endpoint: '/api/research'
    },
    {
        id: 'guide',
        name: 'KilatGuide',
        displayName: 'Kilat Guide',
        icon: 'school',
        colorHex: '#f59e0b',
        color: 'amber',
        category: 'EDU',
        version: '3.1.0',
        description: 'Interactive learning guide creating personalized learning paths with adaptive quizzes and real-time feedback.',
        features: [
            'Personalized learning paths',
            'Interactive quizzes',
            'Progress tracking',
            'Adaptive difficulty'
        ],
        endpoint: '/api/guide'
    },
    {
        id: 'idea',
        name: 'KilatIdea',
        displayName: 'Kilat Idea',
        icon: 'lightbulb',
        color: 'yellow',
        colorHex: '#eab308',
        category: 'BIZ',
        version: '1.5.4',
        description: 'Creative ideation agent generating innovative concepts with trend analysis and feasibility scoring.',
        features: [
            'Brainstorming assistance',
            'Trend analysis',
            'Feasibility scoring',
            'Innovation frameworks'
        ],
        endpoint: '/api/ideagen'
    },
    {
        id: 'write',
        name: 'KilatWrite',
        displayName: 'Kilat Write',
        icon: 'edit_note',
        color: 'pink',
        colorHex: '#ec4899',
        category: 'NLP',
        version: '2.0.1',
        description: 'AI-powered content writing assistant for blogs, articles, and creative writing with style adaptation.',
        features: [
            'Multiple writing styles',
            'SEO optimization',
            'Content structuring',
            'Tone adaptation'
        ],
        endpoint: '/api/cowriter'
    },
    {
        id: 'code',
        name: 'KilatCode',
        displayName: 'Kilat Code',
        icon: 'code',
        color: 'blue',
        colorHex: '#3b82f6',
        category: 'DEV',
        version: '2.4.0',
        description: 'Production-ready code generation with 6 modes: paper2code, text2web, text2backend, vision2code, refactor, test-gen.',
        features: [
            '6 generation modes',
            'Live code preview',
            'Multi-framework support',
            'Boilerplate generation'
        ],
        endpoint: '/api/codegen'
    },
    {
        id: 'image',
        name: 'KilatImage',
        displayName: 'Kilat Image',
        icon: 'image',
        color: 'violet',
        colorHex: '#8b5cf6',
        category: 'DES',
        version: '2.1.0',
        description: 'AI image generation with 9 models: flux, sdxl, anime, and more. High-quality outputs with style control.',
        features: [
            '9 AI models',
            'Style customization',
            'High resolution',
            'Batch generation'
        ],
        endpoint: '/api/imagegen'
    },
    {
        id: 'crawl',
        name: 'KilatCrawl',
        displayName: 'Kilat Crawl',
        icon: 'travel_explore',
        color: 'cyan',
        colorHex: '#06b6d4',
        category: 'DATA',
        version: '1.8.2',
        description: 'Intelligent web scraping with 3 modes: Light (Jina), Medium (Firecrawl), Heavy (Playwright). Auto-detection included.',
        features: [
            '3 scraping modes',
            'Auto mode detection',
            'PDF & image support',
            'Structured extraction'
        ],
        endpoint: '/api/crawl'
    }
];

// Category colors for UI
export const categoryColors: Record<string, string> = {
    'DEV': 'blue',
    'DATA': 'cyan',
    'EDU': 'amber',
    'NLP': 'pink',
    'SEC': 'indigo',
    'BIZ': 'yellow',
    'R&D': 'teal',
    'DES': 'violet',
    'QA': 'red'
};

// Get agent by ID
export const getAgentById = (id: string): Agent | undefined => {
    return agents.find(agent => agent.id === id);
};

// Get agents by category
export const getAgentsByCategory = (category: string): Agent[] => {
    return agents.filter(agent => agent.category === category);
};
