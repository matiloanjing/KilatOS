/**
 * Task Classifier
 * 
 * Classifies user prompts into task types to select the optimal model.
 * Used for "Smart Routing" in the Paid Tier.
 * 
 * Copyright © 2026 KilatCode Studio
 */

export type TaskType = 'reasoning' | 'design' | 'code' | 'research' | 'chat';

export function classifyTask(prompt: string): TaskType {
    const lower = prompt.toLowerCase();

    // 1. Research / Facts (Perplexity)
    if (
        /research|riset|cari tahu|find|search|browse|web|data terkini|news|berita|fakta/.test(lower) ||
        /current|latest|newest|terbaru|terkini/.test(lower) ||
        (/what is|apa itu|siapa|who is/.test(lower) && prompt.length < 50)
    ) {
        return 'research';
    }

    // 2. Code / Technical (Qwen)
    if (
        /code|kode|program|function|fungsi|class|api|endpoint|bug|fix|error|debug/.test(lower) ||
        /react|next|node|typescript|python|sql|database|schema|deploy|git/.test(lower) ||
        /implement|buatkan|buat|bikin|create|generate|refactor|test|coding|ngoding/.test(lower) ||
        /website|web|app|aplikasi|landing page|form|button|navbar|sidebar|component/.test(lower)
    ) {
        return 'code';
    }

    // 3. Design / Creative (Gemini)
    if (
        /design|desain|ui|ux|layout|tampilan|warna|color|logo|image|gambar|poster/.test(lower) ||
        /creative|imaginative|story|cerita|poem|puisi|idea|ide|brainstorm/.test(lower)
    ) {
        return 'design';
    }

    // 4. Heavy Reasoning / Architecture (Claude)
    if (
        /architecture|arsitektur|system design|sistem|plan|strategy|strategi/.test(lower) ||
        /analyze|analisis|evaluate|evaluasi|compare|bandingkan|pros cons|kelebihan kekurangan/.test(lower) ||
        prompt.split(' ').length > 100 // Long prompts usually need reasoning
    ) {
        return 'reasoning';
    }

    // 5. Default: Simple Chat (ChatGPT)
    return 'chat';
}
