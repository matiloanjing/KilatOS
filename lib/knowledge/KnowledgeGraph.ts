/**
 * Knowledge Graph
 * Entity-relation mapping using Supabase
 * 
 * Features:
 * - Entity extraction from knowledge bases
 * - Relationship mapping
 * - Graph traversal queries
 * - Visual graph representation data
 * 
 * Use Cases:
 * - Code dependency analysis
 * - Concept relationship mapping
 * - Cross-referencing learning materials
 */

import { createClient } from '@/lib/auth/server';

// ============================================================================
// Types
// ============================================================================

export interface Entity {
    id: string;
    type: string;  // 'concept', 'code', 'person', 'topic', etc.
    name: string;
    description?: string;
    metadata: Record<string, any>;
    created_at: Date;
}

export interface Relationship {
    id: string;
    source_id: string;
    target_id: string;
    type: string;  // 'depends_on', 'part_of', 'related_to', etc.
    weight: number;  // 0-1, strength of relationship
    metadata?: Record<string, any>;
    created_at: Date;
}

export interface GraphQuery {
    entityId: string;
    depth?: number;  // How many hops to traverse
    relationshipTypes?: string[];
    limit?: number;
}

export interface GraphResult {
    entities: Entity[];
    relationships: Relationship[];
    paths?: Path[];
}

export interface Path {
    nodes: Entity[];
    edges: Relationship[];
    totalWeight: number;
}

// ============================================================================
// Knowledge Graph Class
// ============================================================================

export class KnowledgeGraph {

    // ========================================================================
    // Entity Management
    // ========================================================================

    /**
     * Create or update entity
     */
    async upsertEntity(params: Omit<Entity, 'id' | 'created_at'>): Promise<Entity> {
        const supabase = await createClient();

        // Check if entity exists
        const { data: existing } = await supabase
            .from('kg_entities')
            .select('*')
            .eq('name', params.name)
            .eq('type', params.type)
            .single();

        if (existing) {
            // Update existing
            const { data, error } = await supabase
                .from('kg_entities')
                .update({
                    description: params.description,
                    metadata: params.metadata
                })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        }

        // Create new
        const { data, error } = await supabase
            .from('kg_entities')
            .insert({
                type: params.type,
                name: params.name,
                description: params.description,
                metadata: params.metadata
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Get entity by ID
     */
    async getEntity(id: string): Promise<Entity | null> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('kg_entities')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return data;
    }

    /**
     * Search entities by name
     */
    async searchEntities(query: string, type?: string): Promise<Entity[]> {
        const supabase = await createClient();

        let queryBuilder = supabase
            .from('kg_entities')
            .select('*')
            .ilike('name', `%${query}%`);

        if (type) {
            queryBuilder = queryBuilder.eq('type', type);
        }

        const { data, error } = await queryBuilder.limit(20);

        if (error) return [];
        return data || [];
    }

    // ========================================================================
    // Relationship Management
    // ========================================================================

    /**
     * Create relationship between entities
     */
    async createRelationship(params: Omit<Relationship, 'id' | 'created_at'>): Promise<Relationship> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('kg_relationships')
            .insert({
                source_id: params.source_id,
                target_id: params.target_id,
                type: params.type,
                weight: params.weight,
                metadata: params.metadata
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Get relationships for an entity
     */
    async getRelationships(entityId: string, direction: 'outgoing' | 'incoming' | 'both' = 'both'): Promise<Relationship[]> {
        const supabase = await createClient();

        let query = supabase.from('kg_relationships').select('*');

        if (direction === 'outgoing') {
            query = query.eq('source_id', entityId);
        } else if (direction === 'incoming') {
            query = query.eq('target_id', entityId);
        } else {
            query = query.or(`source_id.eq.${entityId},target_id.eq.${entityId}`);
        }

        const { data, error } = await query;

        if (error) return [];
        return data || [];
    }

    // ========================================================================
    // Graph Traversal
    // ========================================================================

    /**
     * Traverse graph from starting entity
     */
    async traverse(query: GraphQuery): Promise<GraphResult> {
        const {
            entityId,
            depth = 2,
            relationshipTypes = [],
            limit = 100
        } = query;

        const visited = new Set<string>();
        const entities = new Map<string, Entity>();
        const relationships: Relationship[] = [];

        // BFS traversal
        const queue: Array<{ id: string; currentDepth: number }> = [
            { id: entityId, currentDepth: 0 }
        ];

        while (queue.length > 0 && entities.size < limit) {
            const { id, currentDepth } = queue.shift()!;

            if (visited.has(id) || currentDepth > depth) continue;
            visited.add(id);

            // Get entity
            const entity = await this.getEntity(id);
            if (!entity) continue;

            entities.set(id, entity);

            // Get relationships
            const rels = await this.getRelationships(id, 'outgoing');

            for (const rel of rels) {
                // Filter by relationship type if specified
                if (relationshipTypes.length > 0 && !relationshipTypes.includes(rel.type)) {
                    continue;
                }

                relationships.push(rel);

                // Add target to queue if not visited
                if (!visited.has(rel.target_id)) {
                    queue.push({
                        id: rel.target_id,
                        currentDepth: currentDepth + 1
                    });
                }
            }
        }

        return {
            entities: Array.from(entities.values()),
            relationships
        };
    }

    /**
     * Find shortest path between two entities
     */
    async findPath(sourceId: string, targetId: string, maxDepth: number = 5): Promise<Path | null> {
        // BFS to find shortest path
        const queue: Array<{ id: string; path: string[]; edges: Relationship[] }> = [{
            id: sourceId,
            path: [sourceId],
            edges: []
        }];

        const visited = new Set<string>();

        while (queue.length > 0) {
            const { id, path, edges } = queue.shift()!;

            if (id === targetId) {
                // Found target!
                const entities = await Promise.all(
                    path.map(id => this.getEntity(id))
                );

                const totalWeight = edges.reduce((sum, e) => sum + e.weight, 0);

                return {
                    nodes: entities.filter(Boolean) as Entity[],
                    edges,
                    totalWeight
                };
            }

            if (visited.has(id) || path.length > maxDepth) continue;
            visited.add(id);

            // Get outgoing relationships
            const rels = await this.getRelationships(id, 'outgoing');

            for (const rel of rels) {
                if (!visited.has(rel.target_id)) {
                    queue.push({
                        id: rel.target_id,
                        path: [...path, rel.target_id],
                        edges: [...edges, rel]
                    });
                }
            }
        }

        return null; // No path found
    }

    // ========================================================================
    // Graph Analysis
    // ========================================================================

    /**
     * Get most connected entities (highest degree)
     */
    async getMostConnected(limit: number = 10): Promise<Array<{ entity: Entity; degree: number }>> {
        const supabase = await createClient();

        // Count relationships per entity
        const { data } = await supabase.rpc('get_entity_degrees', { result_limit: limit });

        const results = [];
        for (const row of data || []) {
            const entity = await this.getEntity(row.entity_id);
            if (entity) {
                results.push({ entity, degree: row.degree });
            }
        }

        return results;
    }

    /**
     * Get clusters/communities in graph
     */
    async getClusters(): Promise<Array<{ entities: Entity[]; avgWeight: number }>> {
        // Simple clustering: group entities by type
        const supabase = await createClient();

        const { data: entities } = await supabase
            .from('kg_entities')
            .select('*');

        if (!entities) return [];

        // Group by type
        const clusters = new Map<string, Entity[]>();
        for (const entity of entities) {
            if (!clusters.has(entity.type)) {
                clusters.set(entity.type, []);
            }
            clusters.get(entity.type)!.push(entity);
        }

        // Calculate average weight for each cluster
        const results = [];
        for (const [type, clusterEntities] of clusters.entries()) {
            const entityIds = clusterEntities.map(e => e.id);

            const { data: rels } = await supabase
                .from('kg_relationships')
                .select('weight')
                .in('source_id', entityIds)
                .in('target_id', entityIds);

            const avgWeight = rels && rels.length > 0
                ? rels.reduce((sum: number, r: any) => sum + r.weight, 0) / rels.length
                : 0;

            results.push({
                entities: clusterEntities,
                avgWeight
            });
        }

        return results;
    }

    // ========================================================================
    // Export for Visualization
    // ========================================================================

    /**
     * Export graph data in format suitable for visualization (D3.js, etc.)
     */
    async exportForVisualization(entityIds?: string[]): Promise<{
        nodes: Array<{ id: string; label: string; type: string; metadata: any }>;
        links: Array<{ source: string; target: string; type: string; weight: number }>;
    }> {
        const supabase = await createClient();

        // Get entities
        let entityQuery = supabase.from('kg_entities').select('*');
        if (entityIds && entityIds.length > 0) {
            entityQuery = entityQuery.in('id', entityIds);
        }

        const { data: entities } = await entityQuery;

        // Get relationships
        const entityIdList = (entities || []).map((e: any) => e.id);
        const { data: relationships } = await supabase
            .from('kg_relationships')
            .select('*')
            .in('source_id', entityIdList)
            .in('target_id', entityIdList);

        return {
            nodes: (entities || []).map((e: any) => ({
                id: e.id,
                label: e.name,
                type: e.type,
                metadata: e.metadata
            })),
            links: (relationships || []).map((r: any) => ({
                source: r.source_id,
                target: r.target_id,
                type: r.type,
                weight: r.weight
            }))
        };
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const knowledgeGraph = new KnowledgeGraph();

export default KnowledgeGraph;
