import { describe, it, expect } from 'vitest';
import { getTextWidth, stripRichText } from '../../src/core/RichText';
import { SequenceParser } from '../../src/diagrams/sequence/SequenceParser';
import { LayoutEngine } from '../../src/diagrams/sequence/SequenceLayout';
import { defaultTheme } from '../../src/diagrams/sequence/SequenceTheme';

describe('Text Width Precision and Sequence Layout Gap Optimization', () => {
    it('should strip HTML tags and markdown formatting in stripRichText', () => {
        expect(stripRichText('<b>Hello World</b>')).toBe('Hello World');
        expect(stripRichText('<font color="red">Warning</font>')).toBe('Warning');
        expect(stripRichText('**bold** and //italic//')).toBe('bold and italic');
        expect(stripRichText('<U+3042>')).toBe('あ');
    });

    it('should calculate smaller width for narrow characters than wide characters', () => {
        const narrowWidth = getTextWidth('iiiiiiiiii', 13);
        const wideWidth = getTextWidth('MMMMMMMMMM', 13);
        expect(narrowWidth).toBeLessThan(wideWidth);
    });

    it('should calculate larger width for CJK / Japanese full-width text', () => {
        const latinWidth = getTextWidth('hello world', 13);
        const cjkWidth = getTextWidth('こんにちは世界', 13);
        expect(cjkWidth).toBeGreaterThan(latinWidth);
    });

    it('should ignore markup tags when calculating text width', () => {
        const plainWidth = getTextWidth('Hello World', 13);
        const taggedWidth = getTextWidth('<b><font color="red">Hello World</font></b>', 13);
        expect(taggedWidth).toEqual(plainWidth);
    });

    it('should optimize participant gap for sequence diagrams with long self-messages', () => {
        const code = `
ParticipantNumber1 -> ParticipantNumber2 : this is a very long message that is very long
ParticipantNumber1 -> ParticipantNumber1 : this is a very long message that is very long
ParticipantNumber2 -> ParticipantNumber3 : foo2
        `;
        const parser = new SequenceParser();
        const diagram = parser.parse(code);
        const engine = new LayoutEngine(defaultTheme);
        const result = engine.calculateLayout(diagram);

        const p1 = result.participants.find(p => p.participant.name === 'ParticipantNumber1')!;
        const p2 = result.participants.find(p => p.participant.name === 'ParticipantNumber2')!;

        const gapBetweenP1AndP2 = p2.x - (p1.x + p1.width);
        
        // Self message label text is around 250px wide
        // Label right reach from P1 center: ~40 + 5 + 250 = 295px
        // P1 center to P2 left edge gap should be reasonable (< 350px) instead of bloated (> 450px)
        expect(gapBetweenP1AndP2).toBeLessThan(350);

        // Verify that self-message label of P1 does NOT overlap P2's box
        const selfMsg = result.messages.find(m => m.message.from === 'ParticipantNumber1' && m.message.to === 'ParticipantNumber1')!;
        const labelRightX = selfMsg.labelPosition.x + (250); // Label right edge estimate
        expect(p2.x).toBeGreaterThan(labelRightX - 50); // P2 left edge is to the right of label
    });
});
