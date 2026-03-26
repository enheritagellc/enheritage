import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { Card, Spinner } from '@enheritage/ui';
import {
  getTree,
  createTree,
  addNode,
  addRelationship,
  getExportUrl,
  type FamilyTree,
  type TreeNode,
} from '@/api/familyTree';

const generationLabels: Record<number, string> = {
  0: 'Great-Grandparents',
  1: 'Grandparents',
  2: 'Parents / Subject',
  3: 'Children',
};

function MemberCard({ node }: { node: TreeNode }) {
  const isSubject = node.isSubject;
  const initials = [node.firstName, node.lastName]
    .map((n) => n?.[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const years = [
    node.birthDate ? node.birthDate.slice(0, 4) : null,
    node.deathDate ? node.deathDate.slice(0, 4) : null,
  ]
    .filter(Boolean)
    .join(' – ');

  return (
    <div
      className={[
        'flex flex-col items-center p-3 rounded-lg border text-center w-36',
        isSubject
          ? 'bg-[#2B5BA8] border-[#1B3A6B] text-white'
          : 'bg-white border-[#E4E7EC] text-[#344054]',
      ].join(' ')}
    >
      <div
        className={[
          'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold mb-2',
          isSubject ? 'bg-white/20 text-white' : 'bg-[#E8EEF7] text-[#2B5BA8]',
        ].join(' ')}
      >
        {initials}
      </div>
      <p className="text-xs font-semibold leading-snug">
        {node.firstName} {node.lastName}
      </p>
      {years && (
        <p className={`text-xs mt-0.5 ${isSubject ? 'text-white/70' : 'text-[#98A2B3]'}`}>
          {years}
        </p>
      )}
    </div>
  );
}

// ── Add member modal ────────────────────────────────────────────────────────

interface AddMemberModalProps {
  treeId: string;
  nodes: TreeNode[];
  onAdded: () => void;
  onClose: () => void;
}

function AddMemberModal({ treeId, nodes, onAdded, onClose }: AddMemberModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [relType, setRelType] = useState('CHILD_OF');
  const [relToNodeId, setRelToNodeId] = useState(nodes[0]?.id ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const node = await addNode(treeId, {
        firstName, lastName,
        birthDate: birthDate || undefined,
        birthPlace: birthPlace || undefined,
      });
      if (relToNodeId) {
        await addRelationship(treeId, node.id, relToNodeId, relType);
      }
      onAdded();
    } catch {
      setError('Could not add member. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-semibold text-[#101828] mb-4">Add Family Member</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#344054] mb-1">First Name</label>
              <input required value={firstName} onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5BA8]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#344054] mb-1">Last Name</label>
              <input required value={lastName} onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5BA8]" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#344054] mb-1">Birth Date (optional)</label>
            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5BA8]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#344054] mb-1">Birth Place (optional)</label>
            <input value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)}
              placeholder="e.g. Brooklyn, NY"
              className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5BA8]" />
          </div>
          {nodes.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#344054] mb-1">Relationship</label>
                <select value={relType} onChange={(e) => setRelType(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5BA8]">
                  {['CHILD_OF','PARENT_OF','SPOUSE_OF','SIBLING_OF','PARTNER_OF','STEP_CHILD_OF','ADOPTED_BY']
                    .map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#344054] mb-1">To</label>
                <select value={relToNodeId} onChange={(e) => setRelToNodeId(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5BA8]">
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>{n.firstName} {n.lastName}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-[#344054] border border-[#D0D5DD] rounded-lg hover:bg-[#F9FAFB] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#2B5BA8] rounded-lg hover:bg-[#1B3A6B] transition-colors disabled:opacity-50">
              {saving ? 'Adding…' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function FamilyTreePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth0();
  const [tree, setTree] = useState<FamilyTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const loadTree = async (treeId: string) => {
    try {
      const data = await getTree(treeId);
      setTree(data);
    } catch {
      setError('Could not load family tree.');
    } finally {
      setLoading(false);
    }
  };

  const createNewTree = async () => {
    if (!user?.sub) return;
    // `id` here is the interview/session ID — create a tree linked to it
    const subjectName = id ?? 'Subject';
    try {
      const newTree = await createTree(user.sub, 'Family', 'Member', `${subjectName}'s Family Tree`);
      setTree(newTree);
    } catch {
      setError('Could not create family tree.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    // Try to load a tree where the treeId equals `id`; if not found, offer to create one
    getTree(id)
      .then((data) => { setTree(data); setLoading(false); })
      .catch(() => {
        // No tree for this ID — show create prompt
        setLoading(false);
      });
  }, [id]);

  const nodes = tree?.nodes ?? [];
  const generationMap: Record<number, TreeNode[]> = {};
  // Assign generations: subject=2, their parents=1, grandparents=0, children=3
  // Simple heuristic: subject is generation 2, derive others from relationships
  const subjectNode = nodes.find((n) => n.isSubject);
  const childNodeIds = new Set(
    (tree?.relationships ?? [])
      .filter((r) => r.type === 'CHILD_OF' && r.toNodeId === subjectNode?.id)
      .map((r) => r.fromNodeId)
  );
  const parentNodeIds = new Set(
    (tree?.relationships ?? [])
      .filter((r) => r.type === 'CHILD_OF' && r.fromNodeId === subjectNode?.id)
      .map((r) => r.toNodeId)
  );

  for (const node of nodes) {
    let gen = 2;
    if (childNodeIds.has(node.id)) gen = 3;
    else if (parentNodeIds.has(node.id)) gen = 1;
    else if (!node.isSubject && !childNodeIds.has(node.id) && !parentNodeIds.has(node.id)) gen = 0;
    (generationMap[gen] ??= []).push(node);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!tree) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold text-[#101828] mb-6">Family Tree</h1>
        <Card title="No Family Tree Yet">
          <p className="text-sm text-[#667085] mb-4">
            Start building your family tree to preserve your ancestry.
          </p>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <button
            type="button"
            onClick={createNewTree}
            className="px-4 py-2 text-sm font-medium text-white bg-[#2B5BA8] rounded-lg hover:bg-[#1B3A6B] transition-colors"
          >
            Create Family Tree
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#101828]">{tree.name}</h1>
          <p className="text-sm text-[#667085] mt-1">
            {nodes.length} member{nodes.length !== 1 ? 's' : ''} ·{' '}
            {(tree.relationships ?? []).length} relationship{(tree.relationships ?? []).length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={getExportUrl(tree.id)}
            download
            className="px-4 py-2 text-sm font-medium text-[#344054] border border-[#D0D5DD] rounded-lg hover:bg-[#F9FAFB] transition-colors"
          >
            Export GEDCOM
          </a>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-[#2B5BA8] rounded-lg hover:bg-[#1B3A6B] transition-colors"
          >
            Add Member
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      <Card title="Family Tree" subtitle="Generational view">
        {nodes.length === 0 ? (
          <div className="py-8 text-center text-sm text-[#667085]">
            No members yet — add the first family member.
          </div>
        ) : (
          <div className="space-y-8 overflow-x-auto pb-4">
            {[0, 1, 2, 3].map((gen) => {
              const members = generationMap[gen] ?? [];
              if (members.length === 0) return null;
              return (
                <div key={gen}>
                  <p className="text-xs font-semibold text-[#98A2B3] uppercase tracking-wider mb-3">
                    {generationLabels[gen]}
                  </p>
                  <div className="flex flex-wrap gap-4">
                    {members.map((node) => (
                      <MemberCard key={node.id} node={node} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {showAddModal && (
        <AddMemberModal
          treeId={tree.id}
          nodes={nodes}
          onAdded={() => { setShowAddModal(false); void loadTree(tree.id); }}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
