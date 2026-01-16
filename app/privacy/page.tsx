import { PageHeader } from '@/components/ui/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { Lock } from 'lucide-react';

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-background-dark font-body selection:bg-primary/30 antialiased pt-24 pb-20">
            <div className="container mx-auto px-6 max-w-4xl">
                <PageHeader
                    title="Privacy Policy"
                    subtitle="We value your trust and your code. Last updated: January 2026"
                    icon={<Lock className="w-8 h-8 text-green-400" />}
                />

                <GlassCard className="prose prose-invert max-w-none text-slate-300">
                    <h3>1. Data Collection</h3>
                    <p>
                        We collect:
                        <ul className="list-disc pl-5 mt-2">
                            <li>Account information (email, username).</li>
                            <li>Usage data (prompts, code generation stats).</li>
                            <li>Application logs for debugging.</li>
                        </ul>
                    </p>

                    <h3>2. AI Training & Data Usage</h3>
                    <p>
                        <strong>Free Tier:</strong> Anonymized interactions may be used to improve our models.
                    </p>
                    <p>
                        <strong>Pro & Enterprise:</strong> Your proprietary code and prompts are <strong>NEVER</strong> used to train our public models.
                        Your data is isolated and encrypted.
                    </p>

                    <h3>3. Data Retention</h3>
                    <p>
                        Chat history is stored to provide context for your sessions. You can delete specific sessions or your entire account at any time.
                        Deleted data is permanently removed from our active databases.
                    </p>

                    <h3>4. Third-Party Processors</h3>
                    <p>
                        We use trusted third-party providers for specific functions:
                        <ul className="list-disc pl-5 mt-2">
                            <li><strong>Supabase:</strong> Database and Authentication.</li>
                            <li><strong>Stripe:</strong> Payment processing (we do not store credit card info).</li>
                        </ul>
                    </p>

                    <h3>5. Your Rights</h3>
                    <p>
                        You have the right to access, correct, or delete your personal data. Contact us at <a href="/contact" className="text-primary">privacy@kilatos.ai</a> to exercise these rights.
                    </p>
                </GlassCard>
            </div>
        </div>
    );
}
