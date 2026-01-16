/**
 * Jest Setup File
 * Global test configuration and mocks
 * Copyright © 2025 KilatCode Studio
 */

import '@testing-library/jest-dom';

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.NEXTAUTH_URL = 'http://localhost:3000';

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => ({
        from: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
            then: jest.fn().mockResolvedValue({ data: [], error: null })
        })),
        auth: {
            getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null })
        }
    }))
}));

// Mock NextAuth
jest.mock('next-auth', () => ({
    default: jest.fn(),
    getServerSession: jest.fn()
}));

// Mock Pollination AI client
jest.mock('@/lib/ai/pollination-client', () => ({
    chatCompletion: jest.fn().mockResolvedValue('Mocked AI response')
}));

// Global test helpers
global.testHelpers = {
    mockSession: (provider: string = 'github') => ({
        user: {
            name: 'Test User',
            email: 'test@example.com',
            accessToken: 'test-token',
            provider
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }),

    mockCodeGenResponse: () => ({
        sessionId: 'test-session-123',
        status: 'completed',
        iteration: 1,
        code: {
            files: {
                'App.tsx': 'export default function App() { return <div>Test</div>; }'
            }
        },
        errors: [],
        cost: {
            pollen: 0.5,
            tokens: 1000
        }
    }),

    mockFeedbackData: () => ({
        sessionId: 'test-session-123',
        agentType: 'codegen' as const,
        userRating: 5 as const,
        wasSuccessful: true,
        modelUsed: 'claude',
        executionTime: 1000,
        costPollen: 0.5
    })
};

// Declare global types
declare global {
    var testHelpers: {
        mockSession: (provider?: string) => any;
        mockCodeGenResponse: () => any;
        mockFeedbackData: () => any;
    };
}
