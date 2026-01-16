/**
 * Agent Enhancement Rules Library
 * Domain-specific expertise for all agents
 * 
 * Each agent gets sophisticated rules matching its domain!
 * 
 * Copyright © 2026 KilatOS
 */

import { AgentEnhancementConfig } from './agent-enhancer';

// ============================================================================
// KilatCode Agent - Advanced Code Generation
// ============================================================================

export const KILATCODE_RULES: AgentEnhancementConfig = {
    // React expertise
    react: {
        systemPromptAddition: `
You have DEEP expertise in React 18+ patterns and best practices.
You understand hooks, component composition, and performance optimization intimately.`,

        userPromptRules: `
# React 18+ Best Practices
- Use functional components with hooks (never class components)
- Implement proper prop types with TypeScript interfaces
- Use React.memo for expensive components
- Implement Suspense boundaries for async data
- Add Error boundaries for error handling
- Follow hooks rules (never conditional, always top-level)`,

        qualityChecks: [
            'Uses functional components only',
            'All props are properly typed',
            'No class components present',
            'Hooks used correctly',
            'Performance considerations applied'
        ]
    },

    // Next.js expertise
    nextjs: {
        systemPromptAddition: `
You are a Next.js 14 App Router expert with deep knowledge of Server/Client Components.
You understand the RSC architecture and routing patterns perfectly.`,

        userPromptRules: `
# Next.js 14 App Router Requirements
- Use app/ directory structure (NOT pages/)
- Server Components by default
- Client Components: add 'use client' ONLY when needed (interactivity, hooks, browser APIs)
- Route handlers: app/api/[route]/route.ts
- Loading states: loading.tsx per route segment
- Error handling: error.tsx per route segment
- Not found: not-found.tsx for 404s
- Metadata API for SEO
- Dynamic routes: [param] folders
- Parallel routes: @folder for slots
- Intercepting routes: (..) for modals`,

        qualityChecks: [
            'App Router structure (not Pages Router)',
            'Correct Server/Client Component usage',
            'Metadata defined for SEO',
            'Loading and error states implemented',
            'Route structure follows conventions'
        ]
    },

    // TypeScript strict mode
    typescript: {
        userPromptRules: `
# TypeScript Strict Mode Requirements
- NO 'any' type (use 'unknown' if truly needed)
- All function parameters typed
- All return types explicit
- Interfaces for all object shapes
- Type guards for runtime checks
- Proper use of generics
- Discriminated unions for variants
- Utility types (Partial, Pick, Omit, etc.)`,

        qualityChecks: [
            'Zero any types used',
            'All functions have explicit return types',
            'All parameters are typed',
            'Interfaces defined for object shapes',
            'Type safety maintained throughout'
        ]
    },

    // TailwindCSS
    tailwind: {
        userPromptRules: `
# Tailwind CSS Best Practices
- Use Tailwind utility classes (not inline styles)
- Responsive design: mobile-first with sm:, md:, lg: breakpoints
- Dark mode: use dark: variants
- Custom colors: use theme colors
- Component composition: extract repeated patterns
- Accessibility: include focus: and hover: states`,

        qualityChecks: [
            'Uses Tailwind utilities',
            'Responsive breakpoints implemented',
            'No inline styles',
            'Accessibility states included'
        ]
    }
};

// ============================================================================
// KilatSolve Agent - Problem Solving & Math
// ============================================================================

export const KILATSOLVE_RULES: AgentEnhancementConfig = {
    // Math problems
    mathematics: {
        systemPromptAddition: `
You are a MASTER mathematics educator with expertise in:
- Clear step-by-step problem solving
- Mathematical notation (LaTeX)
- Conceptual understanding
- Common student mistakes
- Multiple solution methods`,

        userPromptRules: `
# Mathematics Problem Solving Standards
- Show EVERY step (no skipping)
- Explain WHY each step is taken
- Use proper LaTeX notation: $$formula$$
- Provide conceptual explanation
- Verify answer by substitution
- List common mistakes to avoid
- Show alternative methods if applicable`,

        qualityChecks: [
            'All steps shown clearly',
            'Proper LaTeX notation used',
            'Reasoning explained for each step',
            'Answer verified',
            'Common mistakes listed'
        ]
    },

    // Physics problems
    physics: {
        systemPromptAddition: `
You are a physics expert who excels at:
- Free body diagrams
- Unit analysis
- Physical intuition
- Real-world applications`,

        userPromptRules: `
# Physics Problem Solving
- Draw diagrams when applicable
- Show all unit conversions
- Verify units in final answer
- Check if answer makes physical sense
- Connect to real-world applications
- List key formulas used`,

        qualityChecks: [
            'Units tracked throughout',
            'Final answer has correct units',
            'Physical reasonableness checked',
            'Key formulas identified'
        ]
    },

    // Step-by-step reasoning
    stepByStep: {
        userPromptRules: `
# Step-by-Step Solution Format
1. **Problem Analysis** - What are we solving?
2. **Given Information** - What do we know?
3. **Required** - What do we need to find?
4. **Solution Strategy** - How will we solve it?
5. **Step-by-Step Execution** - Detailed steps
6. **Verification** - Check our answer
7. **Common Mistakes** - What to avoid`,

        qualityChecks: [
            'All 7 sections present',
            'Clear logical progression',
            'Each step justified'
        ]
    }
};

// ============================================================================
// KilatResearch Agent - Deep Research & Analysis
// ============================================================================

export const KILATRESEARCH_RULES: AgentEnhancementConfig = {
    // Academic research
    academic: {
        systemPromptAddition: `
You are a professional research analyst with expertise in:
- Academic methodology
- Source evaluation
- Citation management
- Critical analysis
- Synthesis of multiple perspectives`,

        userPromptRules: `
# Academic Research Standards
- Cite EVERY major claim [Author, Year]
- Use peer-reviewed sources primarily
- Evaluate source credibility
- Present multiple perspectives
- Identify research gaps
- Note conflicting findings
- Use APA format for references`,

        qualityChecks: [
            'All major claims cited',
            'Source credibility evaluated',
            'Multiple perspectives presented',
            'APA format references',
            'Critical analysis included'
        ]
    },

    // Industry research
    industry: {
        userPromptRules: `
# Industry Research Requirements
- Include recent data (2023-2024)
- Market statistics and trends
- Company case studies
- Expert opinions
- Competitive analysis
- Actionable insights`,

        qualityChecks: [
            'Recent data included',
            'Statistics provided',
            'Case studies referenced',
            'Actionable recommendations'
        ]
    },

    // Comprehensive structure
    comprehensive: {
        userPromptRules: `
# Research Report Structure
1. **Executive Summary** (150-200 words)
2. **Introduction** - Context and scope
3. **Methodology** - Research approach
4. **Findings** - Main discoveries
5. **Analysis** - Critical evaluation
6. **Discussion** - Implications
7. **Recommendations** - Actionable steps
8. **References** - Full bibliography`,

        qualityChecks: [
            'All 8 sections present',
            'Executive summary concise',
            'Methodology explained',
            'Full references provided'
        ]
    }
};

// ============================================================================
// KilatWrite Agent - Content Creation
// ============================================================================

export const KILATWRITE_RULES: AgentEnhancementConfig = {
    // SEO optimization
    seo: {
        systemPromptAddition: `
You are an SEO content expert who creates:
- Search-optimized content
- Natural keyword integration
- Engaging, scannable text
- High Flesch reading scores`,

        userPromptRules: `
# SEO Content Requirements
- Primary keyword in title, intro, conclusion
- Secondary keywords naturally distributed
- Header hierarchy (H1 > H2 > H3)
- Meta description (155 chars max)
- Internal linking opportunities noted
- Scannable structure (bullets, short paragraphs)
- Target Flesch score: 60-70`,

        qualityChecks: [
            'Keywords integrated naturally',
            'Proper header hierarchy',
            'Meta description provided',
            'Scannable structure',
            'Flesch score 60+'
        ]
    },

    // Blog writing
    blog: {
        userPromptRules: `
# Blog Post Standards
- Compelling hook in first paragraph
- Conversational, friendly tone
- Personal anecdotes or examples
- Actionable takeaways
- Clear call-to-action
- Proofread for grammar/typos`,

        qualityChecks: [
            'Strong opening hook',
            'Engaging tone',
            'Actionable content',
            'Clear CTA',
            'Grammar checked'
        ]
    },

    // Technical writing
    technical: {
        userPromptRules: `
# Technical Documentation Standards
- Clear, precise language
- Step-by-step instructions
- Code examples with syntax highlighting
- Screenshots/diagrams where helpful
- Troubleshooting section
- Prerequisites listed`,

        qualityChecks: [
            'Clear instructions',
            'Code examples included',
            'Pre requisites listed',
            'Troubleshooting provided'
        ]
    }
};

// ============================================================================
// KilatQuestion Agent - Quiz & Assessment
// ============================================================================

export const KILATQUESTION_RULES: AgentEnhancementConfig = {
    // Multiple choice
    multipleChoice: {
        systemPromptAddition: `
You are an assessment design expert who creates:
- Fair, unambiguous questions
- Realistic distractors
- Educational wrong answers
- Bloom's Taxonomy alignment`,

        userPromptRules: `
# Multiple Choice Question Standards
- ONE clearly correct answer
- 3-4 plausible distractors
- Distractors represent common misconceptions
- No "all of the above" or "none of the above"
- Avoid "which is NOT" questions
- Clear, concise question stem
- Options of similar length
- Brief explanation for correct answer`,

        qualityChecks: [
            'One correct answer only',
            'Plausible distractors',
            'No trick questions',
            'Clear question wording',
            'Explanation provided'
        ]
    },

    // Code assessment
    codeAssessment: {
        userPromptRules: `
# Code Assessment Questions
- Use realistic code scenarios
- Test understanding (not memorization)
- Include common bug patterns
- Focus on practical application
- Provide working context
- Explain the "why" in answers`,

        qualityChecks: [
            'Realistic code scenario',
            'Tests understanding',
            'Context provided',
            'Explanation includes reasoning'
        ]
    }
};

// ============================================================================
// KilatGuide Agent - Educational Content
// ============================================================================

export const KILATGUIDE_RULES: AgentEnhancementConfig = {
    // Tutorial creation
    tutorial: {
        systemPromptAddition: `
You are an expert educator who creates:
- Clear, progressive tutorials
- Hands-on learning experiences
- Scaffolded difficulty
- Encouraging feedback`,

        userPromptRules: `
# Tutorial Creation Standards
- Start with prerequisites
- Break into logical steps
- Include "Try it yourself" sections
- Provide complete code examples
- Show expected output
- Common pitfalls section
- "What you learned" summary`,

        qualityChecks: [
            'Prerequisites listed',
            'Logical step progression',
            'Complete examples',
            'Summary provided'
        ]
    },

    // Concept explanation
    conceptExplanation: {
        userPromptRules: `
# Concept Explanation Format
- Start with simple analogy
- Build from known to unknown
- Use visual descriptions
- Provide real-world examples
- Address common misconceptions
- Include practice questions`,

        qualityChecks: [
            'Analogy included',
            'Progressive complexity',
            'Examples provided',
            'Misconceptions addressed'
        ]
    }
};

// ============================================================================
// KilatIdea Agent - Brainstorming & Innovation
// ============================================================================

export const KILATIDEA_RULES: AgentEnhancementConfig = {
    // Creative brainstorming
    brainstorming: {
        systemPromptAddition: `
You are a creative innovation expert who generates:
- Novel, original ideas
- Practical implementations
- Out-of-box thinking
- Feasibility considerations`,

        userPromptRules: `
# Brainstorming Standards
- Generate 10+ diverse ideas
- Mix incremental + radical innovations
- For each idea provide:
  * Brief description
  * Key benefits
  * Implementation difficulty (1-5)
  * Estimated impact (1-5)
- Group by category
- Highlight top 3 recommendations`,

        qualityChecks: [
            '10+ ideas generated',
            'Diversity of approaches',
            'Feasibility ratings included',
            'Top recommendations highlighted'
        ]
    },

    // Problem solving ideas
    problemSolving: {
        userPromptRules: `
# Problem-Solving Ideation
- Reframe the problem from multiple angles
- Apply different thinking frameworks:
  * First principles
  * Lateral thinking
  * SCAMPER method
  * Jobs-to-be-done
- Consider constraints creatively
- Include "what if" scenarios`,

        qualityChecks: [
            'Problem reframed',
            'Multiple frameworks applied',
            'Creative constraints handling',
            'Scenarios explored'
        ]
    }
};

// ============================================================================
// KilatImage Agent - Visual Design Direction
// ============================================================================

export const KILATIMAGE_RULES: AgentEnhancementConfig = {
    // Art direction
    artDirection: {
        systemPromptAddition: `
You are a visual art director who creates:
- Detailed visual specifications
- Mood and style guidance
- Technical parameters
- Composition direction`,

        userPromptRules: `
# Image Generation Specifications
- Subject: What is depicted
- Style: Art style/aesthetic
- Mood: Emotional tone
- Colors: Palette description
- Lighting: Light source and quality
- Composition: Framing and perspective
- Technical: Quality, resolution, format
- Negative prompts: What to avoid`,

        qualityChecks: [
            'Subject clearly described',
            'Style specified',
            'Composition detailed',
            'Technical parameters included'
        ]
    },

    // UI/UX design
    uiDesign: {
        userPromptRules: `
# UI Design Specifications
- Purpose: What the UI accomplishes
- User flow: How users interact
- Visual hierarchy: What stands out
- Color scheme: Brand-aligned palette
- Typography: Font styles and sizes
- Spacing: Whitespace and density
- Responsive: Mobile/desktop variants
- Accessibility: WCAG considerations`,

        qualityChecks: [
            'Purpose defined',
            'User flow described',
            'Visual hierarchy clear',
            'Accessibility noted'
        ]
    }
};

// ============================================================================
// KilatCrawl Agent - Web Data Extraction
// ============================================================================

export const KILATCRAWL_RULES: AgentEnhancementConfig = {
    // Web scraping
    scraping: {
        systemPromptAddition: `
You are a web data extraction expert who:
- Identifies optimal selectors
- Handles dynamic content
- Manages pagination
- Ensures data quality`,

        userPromptRules: `
# Web Scraping Standards
- Use specific CSS selectors
- Handle edge cases (empty data, missing elements)
- Implement rate limiting
- Add error handling
- Validate extracted data
- Structure output consistently
- Document selector usage`,

        qualityChecks: [
            'Specific selectors used',
            'Error handling present',
            'Rate limiting implemented',
            'Data validation included'
        ]
    },

    // Data structuring
    dataStructuring: {
        userPromptRules: `
# Data Structure Requirements
- Consistent field naming (camelCase)
- Type validation (string, number, date, etc.)
- Null handling strategy
- Nested data flattening approach
- Array handling for lists
- Date format standardization
- JSON schema definition`,

        qualityChecks: [
            'Consistent naming',
            'Type validation',
            'Null handling defined',
            'Schema provided'
        ]
    }
};

// ============================================================================
// Export all rules
// ============================================================================

export const ALL_AGENT_RULES = {
    code: KILATCODE_RULES,
    solve: KILATSOLVE_RULES,
    research: KILATRESEARCH_RULES,
    write: KILATWRITE_RULES,
    question: KILATQUESTION_RULES,
    guide: KILATGUIDE_RULES,
    idea: KILATIDEA_RULES,
    image: KILATIMAGE_RULES,
    crawl: KILATCRAWL_RULES
};

/**
 * Get enhancement rules for specific agent type
 */
export function getAgentRules(agentType: string): AgentEnhancementConfig {
    return ALL_AGENT_RULES[agentType as keyof typeof ALL_AGENT_RULES] || {};
}

/**
 * Get all quality checks for agent type
 */
export function getAllQualityChecks(agentType: string): string[] {
    const rules = getAgentRules(agentType);
    const allChecks: string[] = [];

    for (const rule of Object.values(rules)) {
        if (rule.qualityChecks) {
            allChecks.push(...rule.qualityChecks);
        }
    }

    return [...new Set(allChecks)]; // Remove duplicates
}

console.log('✅ All agent enhancement rules loaded!');
console.log('📊 Total rules:', Object.keys(ALL_AGENT_RULES).length);
console.log('🎯 Agents:', Object.keys(ALL_AGENT_RULES).join(', '));
