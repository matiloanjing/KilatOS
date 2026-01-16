/**
 * Audit Logger
 * Logs security events for compliance and monitoring
 * 
 * Copyright © 2026 KilatOS
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// Types
// ============================================================================

export type AuditEventType =
    | 'auth_login'
    | 'auth_logout'
    | 'auth_failed'
    | 'api_access'
    | 'data_export'
    | 'settings_change'
    | 'admin_action'
    | 'security_alert'
    | 'rate_limit_exceeded'
    | 'injection_attempt';

export interface AuditResult {
    id: string;
    event_type: AuditEventType;
    user_id?: string;
    session_id?: string;
    ip_address?: string;
    user_agent?: string;
    resource?: string;
    action?: string;
    details?: Record<string, any>;
    severity: 'info' | 'warning' | 'error' | 'critical';
    created_at: string;
}

// ============================================================================
// Audit Logger Functions
// ============================================================================

/**
 * Log a security event
 */
export async function logSecurityEvent(
    eventType: AuditEventType,
    options: {
        userId?: string;
        sessionId?: string;
        ipAddress?: string;
        userAgent?: string;
        resource?: string;
        action?: string;
        details?: Record<string, any>;
        severity?: 'info' | 'warning' | 'error' | 'critical';
    }
): Promise<string | null> {
    try {
        const { data, error } = await supabase
            .from('audit_results')
            .insert({
                event_type: eventType,
                user_id: options.userId,
                session_id: options.sessionId,
                ip_address: options.ipAddress,
                user_agent: options.userAgent,
                resource: options.resource,
                action: options.action,
                details: options.details,
                severity: options.severity || 'info'
            })
            .select('id')
            .single();

        if (error) throw error;

        // Log critical events to console
        if (options.severity === 'critical' || options.severity === 'error') {
            console.error(`🚨 [Audit] ${eventType}:`, options.details);
        }

        return data?.id || null;
    } catch (error) {
        console.error('[AuditLogger] Failed to log event:', error);
        return null;
    }
}

/**
 * Get audit log for a user
 */
export async function getUserAuditLog(
    userId: string,
    limit: number = 100
): Promise<AuditResult[]> {
    try {
        const { data, error } = await supabase
            .from('audit_results')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('[AuditLogger] Failed to get audit log:', error);
        return [];
    }
}

/**
 * Get security alerts (warning/error/critical events)
 */
export async function getSecurityAlerts(
    days: number = 7,
    limit: number = 50
): Promise<AuditResult[]> {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data, error } = await supabase
            .from('audit_results')
            .select('*')
            .in('severity', ['warning', 'error', 'critical'])
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('[AuditLogger] Failed to get alerts:', error);
        return [];
    }
}

/**
 * Get audit summary for admin dashboard
 */
export async function getAuditSummary(
    days: number = 7
): Promise<{
    totalEvents: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
}> {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data, error } = await supabase
            .from('audit_results')
            .select('event_type, severity')
            .gte('created_at', startDate.toISOString());

        if (error || !data) {
            return { totalEvents: 0, byType: {}, bySeverity: {} };
        }

        const byType: Record<string, number> = {};
        const bySeverity: Record<string, number> = {};

        for (const event of data) {
            byType[event.event_type] = (byType[event.event_type] || 0) + 1;
            bySeverity[event.severity] = (bySeverity[event.severity] || 0) + 1;
        }

        return { totalEvents: data.length, byType, bySeverity };
    } catch (error) {
        return { totalEvents: 0, byType: {}, bySeverity: {} };
    }
}

console.log('✅ Audit Logger initialized');
