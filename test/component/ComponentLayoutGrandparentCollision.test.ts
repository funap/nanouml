
import { describe, it, expect } from 'vitest';
import { ComponentParser } from '../../src/diagrams/component/ComponentParser';
import { ComponentLayout, ComponentLayoutResult } from '../../src/diagrams/component/ComponentLayout';
import { defaultTheme } from '../../src/diagrams/component/ComponentTheme';

function parseAndLayout(input: string): ComponentLayoutResult {
    const parser = new ComponentParser();
    const diagram = parser.parse(input);
    const layout = new ComponentLayout(diagram, defaultTheme);
    return layout.calculateLayout();
}

function getRel(result: ComponentLayoutResult, from: string, to: string) {
    return result.relationships.find(
        r => r.relationship.from === from && r.relationship.to === to
    );
}

describe('Component Layout Grandparent Collision', () => {
    it('should NOT curve arrow between components inside a grandparent container', () => {
        const input = `
            package "GrandParent" {
                package "Parent" {
                    [Child1]
                    [Child2]
                }
            }
            [Child1] -> [Child2]
        `;
        const result = parseAndLayout(input);
        const rel = getRel(result, 'Child1', 'Child2');

        expect(rel).toBeDefined();
        // Should be a straight line (2 points)
        // If GrandParent is treated as obstacle, it might curve (3 points)
        expect(rel!.path.length).toBe(2);
    });
});
