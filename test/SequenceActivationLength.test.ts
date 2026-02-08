import { describe, it, expect } from 'vitest';
import { SequenceParser } from '../src/diagrams/sequence/SequenceParser';
import { LayoutEngine } from '../src/diagrams/sequence/SequenceLayout';
import { defaultTheme } from '../src/diagrams/sequence/SequenceTheme';

describe('Sequence Diagram Activation Length', () => {
    it('should have sufficient height for self-activation ended by deactivate', () => {
        const content = `
participant a
a->a++
deactivate a
        `;
        const parser = new SequenceParser();
        const diagram = parser.parse(content);
        const engine = new LayoutEngine(defaultTheme);
        const layout = engine.calculateLayout(diagram);

        const aAct = layout.activations.find(a => a.activation.participantName === 'a')!;

        // Logging for analysis in case it fails
        console.log('Activation startStep:', aAct.activation.startStep);
        console.log('Activation endStep:', aAct.activation.endStep);
        console.log('Activation Y:', aAct.y);
        console.log('Activation Height:', aAct.height);

        // A self-activation should at least cover its own return loop (25px) 
        // plus some padding or the next step's height.
        // If it starts at y+25 and ends at stepY[step+1], and step gap is 45, height is 20.
        expect(aAct.height).toBeGreaterThanOrEqual(20);
    });

    it('should have full step height for self-activation ended by shorthand --', () => {
        const content = `
participant a
a->a++
a->a--
        `;
        const parser = new SequenceParser();
        const diagram = parser.parse(content);
        const engine = new LayoutEngine(defaultTheme);
        const layout = engine.calculateLayout(diagram);

        const aAct = layout.activations.find(a => a.activation.participantName === 'a')!;

        // y = stepY[1] + 25
        // yEnd = stepY[2] + 25
        // height = stepY[2] - stepY[1]
        // stepHeights[1] is 45 (25+10 loop + 10 padding)
        expect(aAct.height).toBeGreaterThanOrEqual(40);
    });
    it('should have sufficient height for cross-participant activation ended by deactivate', () => {
        const content = `
participant a
participant b
a->b++
deactivate b
        `;
        const parser = new SequenceParser();
        const diagram = parser.parse(content);
        const engine = new LayoutEngine(defaultTheme);
        const layout = engine.calculateLayout(diagram);

        const bAct = layout.activations.find(a => a.activation.participantName === 'b')!;

        // For cross-message, y = stepY[0], yEnd = stepY[1]
        // Default gap is 60.
        expect(bAct.height).toBeGreaterThanOrEqual(50);
    });
});
