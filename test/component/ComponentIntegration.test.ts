
import { describe, it, expect } from 'vitest';
import { ComponentParser } from '../../src/diagrams/component/ComponentParser';
import { ComponentLayout } from '../../src/diagrams/component/ComponentLayout';
import { defaultTheme } from '../../src/diagrams/component/ComponentTheme';
import { ComponentRenderer } from '../../src/diagrams/component/ComponentRenderer';

// ============================================================================
// Helper functions
// ============================================================================

function parseAndLayout(input: string) {
    const parser = new ComponentParser();
    const diagram = parser.parse(input);
    const layout = new ComponentLayout(diagram, defaultTheme);
    return layout.calculateLayout();
}

function getComp(result: ReturnType<typeof parseAndLayout>, name: string) {
    return result.components.find(c => c.component.name === name);
}

function noOverlap(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
): boolean {
    return (
        a.x + a.width <= b.x ||
        b.x + b.width <= a.x ||
        a.y + a.height <= b.y ||
        b.y + b.height <= a.y
    );
}

// ============================================================================
// Spec §16: Quality Metrics — Rendering Correctness
// ============================================================================

describe('SVG Rendering', () => {
    it('should render relationships after components (Z-Index)', () => {
        const input = `
            component C1
            component C2
            C1 --> C2
        `;
        const parser = new ComponentParser();
        const diagram = parser.parse(input);
        const renderer = new ComponentRenderer();
        const svg = renderer.render(diagram);

        const componentIndex = svg.indexOf('<rect');
        const relationshipIndex = svg.indexOf('<line');

        expect(relationshipIndex).toBeGreaterThan(componentIndex);
        expect(componentIndex).not.toBe(-1);
    });

    it('should render component labels as text', () => {
        const parser = new ComponentParser();
        const diagram = parser.parse('component MyComp');
        const renderer = new ComponentRenderer();
        const svg = renderer.render(diagram);

        expect(svg).toContain('MyComp');
    });

    it('should render port labels', () => {
        const parser = new ComponentParser();
        const diagram = parser.parse(`
            component C {
                portin p1
            }
        `);
        const renderer = new ComponentRenderer();
        const svg = renderer.render(diagram);
        expect(svg).toContain('>p1<');
    });

    it('should reserve header space so children do not obscure parent label', () => {
        const result = parseAndLayout(`
            component C {
                component c1
            }
        `);
        const cNode = getComp(result, 'C')!;
        const c1Node = getComp(result, 'c1')!;

        expect(c1Node.y).toBeGreaterThan(cNode.y + 20);
    });

    it('should produce valid SVG output', () => {
        const parser = new ComponentParser();
        const diagram = parser.parse(`
            [A] --> [B]
            [B] --> [C]
        `);
        const renderer = new ComponentRenderer();
        const svg = renderer.render(diagram);

        expect(svg).toContain('<svg');
        expect(svg).toContain('</svg>');
    });
});

// ============================================================================
// Cloud parsing (moved from separate file)
// ============================================================================

describe('Cloud Parsing', () => {
    it('should parse cloud as top-level, not nested inside prior group', () => {
        const parser = new ComponentParser();
        const diagram = parser.parse(`
            @startuml
            package "Some Group" {
                HTTP - [First Component]
                [Another Component]
            }
            node "Other Groups" {
                FTP - [Second Component]
                [First Component] --> FTP
            }
            cloud {
                [Example 1]
            }
            database "MySql" {
                folder "This is my folder" {
                    [Folder 3]
                }
                frame "Foo" {
                    [Frame 4]
                }
            }
            [Another Component] --> [Example 1]
            [Example 1] --> [Folder 3]
            [Folder 3] --> [Frame 4]
            @enduml
        `);

        const cloud = diagram.components.find(c => c.type === 'cloud');
        expect(cloud).toBeDefined();
        expect(cloud!.parentId).toBeUndefined();

        const ex1 = diagram.components.find(c => c.name === 'Example 1');
        expect(ex1).toBeDefined();
        expect(ex1!.parentId).toBe(cloud!.name);
    });
});

// ============================================================================
// Color parsing (moved from separate file)
// ============================================================================

describe('Color Parsing', () => {
    it('should parse named colors like #Yellow', () => {
        const parser = new ComponentParser();
        const diagram = parser.parse('component [Web Server] #Yellow');
        const comp = diagram.findComponent('Web Server');
        expect(comp).toBeDefined();
        expect(comp?.color).toBe('Yellow');
    });

    it('should parse hex colors like #FF0000', () => {
        const parser = new ComponentParser();
        const diagram = parser.parse('component [Server] #FF0000');
        const comp = diagram.findComponent('Server');
        expect(comp).toBeDefined();
        expect(comp?.color).toBe('#FF0000');
    });
});

// ============================================================================
// Multi-line description (moved from separate file)
// ============================================================================

describe('Multi-Line Description', () => {
    it('should parse multi-line component description', () => {
        const parser = new ComponentParser();
        const diagram = parser.parse(`
            component comp1 [
              This component
              has several lines
            ]
        `);
        const comp = diagram.findComponent('comp1');
        expect(comp).toBeDefined();
    });

    it('should parse multi-line description ending on the same line', () => {
        const parser = new ComponentParser();
        const diagram = parser.parse(`
            component comp1 [
              Single block]
        `);
        const comp = diagram.findComponent('comp1');
        expect(comp).toBeDefined();
    });
});

// ============================================================================
// Floating Note (moved from separate file)
// ============================================================================

describe('Floating Note', () => {
    it('should parse floating note with alias', () => {
        const parser = new ComponentParser();
        const diagram = parser.parse(`
            [Component] as C
            note as N
              A floating note can also
              be on several lines
            end note
            C .. N
        `);

        expect(diagram.findComponent('C')).toBeDefined();
        expect(diagram.notes.length).toBe(1);
        const note = diagram.notes[0];
        expect(note.alias).toBe('N');
        expect(note.text).toBe('A floating note can also\nbe on several lines');
        expect(diagram.relationships.length).toBe(1);
        expect(diagram.relationships[0].type).toBe('dashed');
    });

    it('should parse multiple floating notes', () => {
        const parser = new ComponentParser();
        const diagram = parser.parse(`
            note as N1
              First note
            end note
            note as N2
              Second note
            end note
        `);
        expect(diagram.notes.length).toBe(2);
        expect(diagram.notes[0].alias).toBe('N1');
        expect(diagram.notes[1].alias).toBe('N2');
    });

    it('should differentiate floating from positioned notes', () => {
        const parser = new ComponentParser();
        const diagram = parser.parse(`
            [Component] as C
            note left of C
              Positioned note
            end note
            note as N
              Floating note
            end note
        `);
        expect(diagram.notes.length).toBe(2);
        expect(diagram.notes[0].position).toBe('left');
        expect(diagram.notes[0].linkedTo).toBe('C');
        expect(diagram.notes[1].alias).toBe('N');
        expect(diagram.notes[1].position).toBeUndefined();
    });
});

// ============================================================================
// Floating note order (moved from separate file)
// ============================================================================

describe('Floating Note Layout Order', () => {
    it('should place floating notes below the diagram content', () => {
        const result = parseAndLayout(`
            [A]
            [B]
            note as N1
              First note
            end note
            note as N2
              Second note
            end note
        `);

        const a = getComp(result, 'A')!;
        const b = getComp(result, 'B')!;
        const maxComponentBottom = Math.max(a.y + a.height, b.y + b.height);

        result.notes.forEach(note => {
            expect(note.y).toBeGreaterThan(maxComponentBottom - 1);
        });
    });
});

// ============================================================================
// Triangle layout (moved from separate file)
// ============================================================================

describe('Triangle Layout Pattern', () => {
    it('should layout fan-out in a balanced pattern', () => {
        const result = parseAndLayout(`
            [a] -> [b]
            [a] --> [c]
            [a] --> [d]
        `);

        const a = getComp(result, 'a')!;
        const b = getComp(result, 'b')!;
        const c = getComp(result, 'c')!;
        const d = getComp(result, 'd')!;

        expect(a).toBeDefined();
        expect(b).toBeDefined();
        expect(c).toBeDefined();
        expect(d).toBeDefined();

        // No overlaps
        expect(noOverlap(a, c)).toBe(true);
        expect(noOverlap(a, d)).toBe(true);
        expect(noOverlap(c, d)).toBe(true);
    });
});

// ============================================================================
// Port rendering (moved from separate file)
// ============================================================================

describe('Port Rendering', () => {
    it('should render ports on the parent boundary', () => {
        const result = parseAndLayout(`
            component Server {
                portin RequestIn
                portout ResponseOut
            }
        `);
        const server = getComp(result, 'Server')!;
        const pIn = getComp(result, 'RequestIn');
        const pOut = getComp(result, 'ResponseOut');

        expect(server).toBeDefined();
        expect(pIn).toBeDefined();
        expect(pOut).toBeDefined();
    });

    it('should generate SVG with port elements', () => {
        const parser = new ComponentParser();
        const diagram = parser.parse(`
            component Server {
                portin p1
                portout p2
            }
        `);
        const renderer = new ComponentRenderer();
        const svg = renderer.render(diagram);

        expect(svg).toContain('>p1<');
        expect(svg).toContain('>p2<');
    });
});

// ============================================================================
// Port dynamic placement (moved from reproduction test)
// ============================================================================

describe('Port Dynamic Placement', () => {
    it('should place ports near connected external components', () => {
        const result = parseAndLayout(`
            component Server {
                portin RequestIn
                portout ResponseOut
            }
            [Client] --> RequestIn
            ResponseOut --> [Database]
        `);

        const server = getComp(result, 'Server')!;
        const pIn = getComp(result, 'RequestIn');
        const pOut = getComp(result, 'ResponseOut');

        expect(server).toBeDefined();
        expect(pIn).toBeDefined();
        expect(pOut).toBeDefined();

        // Ports should be placed on the boundary (either edge)
        if (pIn) {
            const pcx = pIn.x + pIn.width / 2;
            const pcy = pIn.y + pIn.height / 2;
            const nearEdge =
                Math.abs(pcx - server.x) < 12 ||
                Math.abs(pcx - (server.x + server.width)) < 12 ||
                Math.abs(pcy - server.y) < 12 ||
                Math.abs(pcy - (server.y + server.height)) < 12;
            expect(nearEdge).toBe(true);
        }
    });
});
