/**
 * Payment Service Stub
 * ====================
 * Handles "Fake" checkouts for Midtrans (IDR) and Lemon Squeezy (USD).
 * Replace the console.logs with real API calls when keys are available.
 */

export interface CheckoutSession {
    url: string;
    id: string;
}

export const PaymentService = {
    /**
     * Create a Midtrans Snap Transaction (Stub)
     */
    async createMidtransCheckout(plan: string, amount: number): Promise<CheckoutSession> {
        console.log(`[Midtrans] Creating transaction for ${plan}: IDR ${amount}`);
        // TODO: Replace with real Server Action calling Midtrans API
        await new Promise(r => setTimeout(r, 1000)); // Simulate delay
        return {
            url: 'https://simulator.sandbox.midtrans.com/payment-interface', // Fake Sandbox URL
            id: `midtrans_${Date.now()}`
        };
    },

    /**
     * Create a Lemon Squeezy Checkout (Stub)
     */
    async createLemonSqueezyCheckout(variantId: string): Promise<CheckoutSession> {
        console.log(`[LemonSqueezy] Creating checkout for Variant ${variantId}`);
        // TODO: Replace with real Server Action calling Lemon Squeezy API
        await new Promise(r => setTimeout(r, 1000)); // Simulate delay
        return {
            url: 'https://kilatos.lemonsqueezy.com/checkout/buy/...', // Fake Checkout URL
            id: `ls_${Date.now()}`
        };
    }
};
