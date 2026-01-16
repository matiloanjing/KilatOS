/**
 * License Manager
 * Validates and manages enterprise license keys
 * 
 * Copyright © 2026 KilatOS
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// Types
// ============================================================================

export interface License {
    id: string;
    license_key: string;
    organization_name: string;
    tier: 'pro' | 'enterprise';
    max_users: number;
    features: string[];
    status: 'active' | 'expired' | 'revoked';
    activated_at?: string;
    expires_at?: string;
    created_at: string;
}

export interface LicenseValidation {
    isValid: boolean;
    license?: License;
    error?: string;
}

// ============================================================================
// License Manager Functions
// ============================================================================

/**
 * Validate a license key
 */
export async function validateLicense(
    licenseKey: string
): Promise<LicenseValidation> {
    try {
        const { data, error } = await supabase
            .from('licenses')
            .select('*')
            .eq('license_key', licenseKey)
            .single();

        if (error || !data) {
            return { isValid: false, error: 'License key not found' };
        }

        // Check status
        if (data.status === 'revoked') {
            return { isValid: false, license: data, error: 'License has been revoked' };
        }

        if (data.status === 'expired') {
            return { isValid: false, license: data, error: 'License has expired' };
        }

        // Check expiration
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
            // Auto-update status to expired
            await supabase
                .from('licenses')
                .update({ status: 'expired' })
                .eq('id', data.id);

            return { isValid: false, license: data, error: 'License has expired' };
        }

        return { isValid: true, license: data };
    } catch (error) {
        console.error('[LicenseManager] Validation failed:', error);
        return { isValid: false, error: 'Validation error' };
    }
}

/**
 * Activate a license key
 */
export async function activateLicense(
    licenseKey: string
): Promise<LicenseValidation> {
    try {
        const validation = await validateLicense(licenseKey);

        if (!validation.isValid) {
            return validation;
        }

        // Update activation timestamp
        const { error } = await supabase
            .from('licenses')
            .update({
                activated_at: new Date().toISOString(),
                status: 'active'
            })
            .eq('license_key', licenseKey);

        if (error) throw error;

        console.log(`✅ [LicenseManager] License activated: ${licenseKey.substring(0, 8)}...`);
        return validation;
    } catch (error) {
        console.error('[LicenseManager] Activation failed:', error);
        return { isValid: false, error: 'Activation error' };
    }
}

/**
 * Generate a new license key (admin only)
 */
export async function generateLicense(
    organizationName: string,
    options: {
        tier?: 'pro' | 'enterprise';
        maxUsers?: number;
        features?: string[];
        expiresInDays?: number;
    }
): Promise<string | null> {
    try {
        // Generate unique license key
        const licenseKey = generateLicenseKey();

        // Calculate expiration
        const expiresAt = options.expiresInDays
            ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
            : null;

        const { data, error } = await supabase
            .from('licenses')
            .insert({
                license_key: licenseKey,
                organization_name: organizationName,
                tier: options.tier || 'pro',
                max_users: options.maxUsers || 5,
                features: options.features || ['all'],
                status: 'active',
                expires_at: expiresAt
            })
            .select('license_key')
            .single();

        if (error) throw error;

        console.log(`🔑 [LicenseManager] Generated license for ${organizationName}`);
        return data?.license_key || null;
    } catch (error) {
        console.error('[LicenseManager] Generation failed:', error);
        return null;
    }
}

/**
 * Revoke a license
 */
export async function revokeLicense(licenseKey: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('licenses')
            .update({ status: 'revoked' })
            .eq('license_key', licenseKey);

        return !error;
    } catch (error) {
        return false;
    }
}

/**
 * Get all licenses (admin)
 */
export async function getAllLicenses(): Promise<License[]> {
    try {
        const { data, error } = await supabase
            .from('licenses')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        return [];
    }
}

// Helper: Generate unique license key
function generateLicenseKey(): string {
    const segments = [];
    for (let i = 0; i < 4; i++) {
        segments.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return `KILAT-${segments.join('-')}`;
}

console.log('✅ License Manager initialized');
