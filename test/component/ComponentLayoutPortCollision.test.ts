
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

describe('Component Layout Port Collision', () => {
    it('should NOT curve arrow from port to internal component (p1 -> c1)', () => {
        const input = `
            [c]
            component C {
              portin p1
              component c1
            }
            c --> p1
            p1 --> c1
        `;
        const result = parseAndLayout(input);
        const rel = getRel(result, 'p1', 'c1');

        expect(rel).toBeDefined();
        // Should be a straight line (2 points), not a curve (3 points)
        expect(rel!.path.length).toBe(2);
    });
});
