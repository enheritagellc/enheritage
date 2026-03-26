/**
 * GEDCOM 5.5.1 exporter.
 *
 * Produces a standards-compliant GEDCOM file that can be imported into
 * Ancestry, FamilySearch, MacFamilyTree, and other genealogy applications.
 *
 * Reference: https://www.gedcom.org/gedcom.html (GEDCOM 5.5.1)
 */

export interface GedcomNode {
  id: string;
  firstName: string;
  lastName: string;
  birthName?: string;
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  notes?: string;
  gedcomId?: string;
}

export interface GedcomRelationship {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  type: string;
  startDate?: string;
  endDate?: string;
}

export interface GedcomTree {
  id: string;
  name: string;
  nodes: GedcomNode[];
  relationships: GedcomRelationship[];
}

/** Map from node UUID to GEDCOM xref id, e.g. @I1@ */
type XrefMap = Map<string, string>;

function isoToGedcom(iso: string | undefined | null): string | null {
  if (!iso) return null;
  // Accept full ISO dates (YYYY-MM-DD) or year-only
  const match = iso.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?/);
  if (!match) return null;
  const [, year, month, day] = match;
  const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  if (day && month) return `${parseInt(day)} ${MONTHS[parseInt(month) - 1]} ${year}`;
  if (month) return `${MONTHS[parseInt(month) - 1]} ${year}`;
  return year;
}

function buildXrefMap(nodes: GedcomNode[]): XrefMap {
  const map: XrefMap = new Map();
  nodes.forEach((node, i) => {
    map.set(node.id, node.gedcomId ?? `I${i + 1}`);
  });
  return map;
}

function renderIndividual(node: GedcomNode, xref: string): string {
  const lines: string[] = [`0 @${xref}@ INDI`];

  // NAME tag — surname wrapped in /slashes/ per GEDCOM convention
  const surname = node.lastName ? `/${node.lastName}/` : '//';
  const given = node.firstName ?? '';
  lines.push(`1 NAME ${given} ${surname}`.trimEnd());
  if (node.firstName) lines.push(`2 GIVN ${node.firstName}`);
  if (node.lastName)  lines.push(`2 SURN ${node.lastName}`);
  if (node.birthName) lines.push(`2 _MARN ${node.birthName}`); // maiden name extension

  // Birth
  const birthDate = isoToGedcom(node.birthDate);
  if (birthDate || node.birthPlace) {
    lines.push('1 BIRT');
    if (birthDate)       lines.push(`2 DATE ${birthDate}`);
    if (node.birthPlace) lines.push(`2 PLAC ${node.birthPlace}`);
  }

  // Death
  const deathDate = isoToGedcom(node.deathDate);
  if (deathDate || node.deathPlace) {
    lines.push('1 DEAT');
    if (deathDate)       lines.push(`2 DATE ${deathDate}`);
    if (node.deathPlace) lines.push(`2 PLAC ${node.deathPlace}`);
  }

  // Notes
  if (node.notes) {
    // GEDCOM note lines max 248 chars; split naively
    const chunks = node.notes.match(/.{1,248}/g) ?? [];
    chunks.forEach((chunk, i) => {
      lines.push(`${i === 0 ? '1 NOTE' : '2 CONT'} ${chunk}`);
    });
  }

  return lines.join('\r\n');
}

/**
 * Build FAM records from SPOUSE_OF relationships, attaching children.
 *
 * GEDCOM represents a family unit as a FAM record linking a husband, wife,
 * and children.  We derive families from SPOUSE_OF edges, then attach any
 * CHILD_OF / PARENT_OF edges.
 */
function buildFamilies(
  relationships: GedcomRelationship[],
  xrefMap: XrefMap,
): string[] {
  const spouseEdges = relationships.filter((r) =>
    r.type === 'SPOUSE_OF' || r.type === 'PARTNER_OF',
  );
  const childEdges = relationships.filter((r) =>
    r.type === 'CHILD_OF' || r.type === 'ADOPTED_BY',
  );
  const parentEdges = relationships.filter((r) => r.type === 'PARENT_OF');

  const families: string[] = [];
  const seen = new Set<string>(); // dedup spouse pairs

  spouseEdges.forEach((edge, i) => {
    const key = [edge.fromNodeId, edge.toNodeId].sort().join(':');
    if (seen.has(key)) return;
    seen.add(key);

    const famXref = `F${i + 1}`;
    const lines: string[] = [`0 @${famXref}@ FAM`];
    lines.push(`1 HUSB @${xrefMap.get(edge.fromNodeId)}@`);
    lines.push(`1 WIFE @${xrefMap.get(edge.toNodeId)}@`);

    // Marriage date
    const marDate = isoToGedcom(edge.startDate);
    if (marDate) {
      lines.push('1 MARR');
      lines.push(`2 DATE ${marDate}`);
    }

    // Divorce date
    const divDate = isoToGedcom(edge.endDate);
    if (divDate) {
      lines.push('1 DIV');
      lines.push(`2 DATE ${divDate}`);
    }

    // Children via CHILD_OF (child → parent)
    childEdges.forEach((ce) => {
      const parentXref = xrefMap.get(ce.toNodeId);
      if (parentXref === xrefMap.get(edge.fromNodeId) ||
          parentXref === xrefMap.get(edge.toNodeId)) {
        const childXref = xrefMap.get(ce.fromNodeId);
        if (childXref) lines.push(`1 CHIL @${childXref}@`);
      }
    });

    // Children via PARENT_OF (parent → child)
    parentEdges.forEach((pe) => {
      const pXref = xrefMap.get(pe.fromNodeId);
      if (pXref === xrefMap.get(edge.fromNodeId) ||
          pXref === xrefMap.get(edge.toNodeId)) {
        const childXref = xrefMap.get(pe.toNodeId);
        if (childXref) lines.push(`1 CHIL @${childXref}@`);
      }
    });

    families.push(lines.join('\r\n'));
  });

  return families;
}

export function exportToGedcom(tree: GedcomTree): string {
  const xrefMap = buildXrefMap(tree.nodes);
  const now = new Date();
  const gedcomDate = `${now.getDate()} ${
    ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][now.getMonth()]
  } ${now.getFullYear()}`;

  const sections: string[] = [];

  // HEAD
  sections.push([
    '0 HEAD',
    '1 SOUR EnHeritage',
    '2 VERS 1.0',
    '2 NAME EnHeritage',
    '1 DATE ' + gedcomDate,
    '1 FILE ' + tree.name.replace(/[^a-zA-Z0-9_-]/g, '_') + '.ged',
    '1 GEDC',
    '2 VERS 5.5.1',
    '2 FORM LINEAGE-LINKED',
    '1 CHAR UTF-8',
    '1 SUBM @SUBM@',
    '0 @SUBM@ SUBM',
    '1 NAME EnHeritage',
  ].join('\r\n'));

  // INDI records
  for (const node of tree.nodes) {
    const xref = xrefMap.get(node.id)!;
    sections.push(renderIndividual(node, xref));
  }

  // FAM records
  const families = buildFamilies(tree.relationships, xrefMap);
  sections.push(...families);

  // TRLR
  sections.push('0 TRLR');

  return sections.join('\r\n') + '\r\n';
}
