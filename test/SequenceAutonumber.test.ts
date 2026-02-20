import { describe, it, expect } from 'vitest';
import { SequenceParser } from '../src/diagrams/sequence/SequenceParser';

describe('Sequence Autonumber', () => {
    it('should handle autonumber stop and resume', () => {
        const parser = new SequenceParser();
        const content = `
autonumber
A -> B: Msg 1
autonumber stop
A -> B: Msg 2
autonumber resume
A -> B: Msg 3
        `;
        const diagram = parser.parse(content);

        expect(diagram.messages[0].number).toBe('1');
        expect(diagram.messages[1].number).toBeUndefined();
        expect(diagram.messages[2].number).toBe('2');
    });

    it('should support starting number and increment with stop/resume', () => {
        const parser = new SequenceParser();
        const content = `
autonumber 10 5
A -> B: Msg 10
autonumber stop
A -> B: Msg No
autonumber resume
A -> B: Msg 15
        `;
        const diagram = parser.parse(content);

        expect(diagram.messages[0].number).toBe('10');
        expect(diagram.messages[1].number).toBeUndefined();
        expect(diagram.messages[2].number).toBe('15');
    });

    it('should handle autonumber resume with format', () => {
        const parser = new SequenceParser();
        const content = `
autonumber
A -> B: 1
autonumber stop
A -> B: None
autonumber resume "<b>Msg %d</b>"
A -> B: 2
        `;
        const diagram = parser.parse(content);

        expect(diagram.messages[0].number).toBe('1');
        expect(diagram.messages[1].number).toBeUndefined();
        // Currently we don't actually implement the formatting in the string,
        // we just store it. The requirement only mentioned handling the syntax error.
        // If we want to support formatting, we'd need to update SequenceDiagram's msgNumber logic.
        expect(diagram.messages[2].number).toBe('<b>Msg 2</b>');
    });

    it('should handle hierarchical autonumber 1.1.1 and inc A/B', () => {
        const parser = new SequenceParser();
        const content = `
autonumber 1.1
A -> B: Msg 1.1
A -> B: Msg 1.2
autonumber inc A
A -> B: Msg 2.1
autonumber inc B
A -> B: Msg 2.2
        `;
        const diagram = parser.parse(content);
        expect(diagram.messages[0].number).toBe('1.1');
        expect(diagram.messages[1].number).toBe('1.2');
        expect(diagram.messages[2].number).toBe('2.1');
        expect(diagram.messages[3].number).toBe('2.2');
    });

    it('should replace %autonumber% in notes', () => {
        const parser = new SequenceParser();
        const content = `
autonumber
A -> B: msg
note right: count is %autonumber%
        `;
        const diagram = parser.parse(content);
        expect(diagram.messages[0].number).toBe('1');
        expect(diagram.notes[0].text).toContain('count is 1');
    });

    it('should replace <U+XXXX> after %autonumber%', () => {
        const parser = new SequenceParser();
        const content = `
autonumber
A -> B: msg
note right
  the <U+0025>autonumber<U+0025> works.
  char: <U+3042>
end note
        `;
        const diagram = parser.parse(content);
        // <U+0025> becomes % AFTER %autonumber% check, so it stays as %autonumber% literal
        expect(diagram.notes[0].text).toContain('the %autonumber% works.');
        // <U+3042> is 'あ'
        expect(diagram.notes[0].text).toContain('char: あ');
    });
});
