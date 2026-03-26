import { makeServiceClient } from './client';

const client = makeServiceClient(
  (import.meta.env.VITE_FAMILY_TREE_API_URL as string) || 'http://localhost:3005',
);

export interface TreeNode {
  id: string;
  treeId: string;
  firstName: string;
  lastName: string;
  birthName?: string;
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  notes?: string;
  isSubject: boolean;
  createdAt: string;
}

export interface Relationship {
  id: string;
  treeId: string;
  fromNodeId: string;
  toNodeId: string;
  type: string;
  status: string;
  startDate?: string;
  endDate?: string;
  confidence: number;
}

export interface FamilyTree {
  id: string;
  ownerId: string;
  name: string;
  subjectNodeId: string;
  nodes: TreeNode[];
  relationships: Relationship[];
  gedcomExportS3Key?: string;
  createdAt: string;
  updatedAt: string;
}

export async function createTree(
  ownerId: string,
  subjectFirstName: string,
  subjectLastName: string,
  name?: string,
  subjectBirthDate?: string,
): Promise<FamilyTree> {
  const { data } = await client.post<FamilyTree>('/trees', {
    ownerId, name, subjectFirstName, subjectLastName, subjectBirthDate,
  });
  return data;
}

export async function getTree(treeId: string): Promise<FamilyTree> {
  const { data } = await client.get<FamilyTree>(`/trees/${treeId}`);
  return data;
}

export async function listTrees(ownerId: string): Promise<FamilyTree[]> {
  const { data } = await client.get<{ trees: FamilyTree[] }>('/trees', { params: { ownerId } });
  return data.trees;
}

export async function addNode(
  treeId: string,
  node: Omit<Partial<TreeNode>, 'id' | 'treeId' | 'createdAt'> & { firstName: string; lastName: string },
): Promise<TreeNode> {
  const { data } = await client.post<TreeNode>(`/trees/${treeId}/nodes`, node);
  return data;
}

export async function addRelationship(
  treeId: string,
  fromNodeId: string,
  toNodeId: string,
  type: string,
  extra?: { startDate?: string; endDate?: string; status?: string },
): Promise<Relationship> {
  const { data } = await client.post<Relationship>(`/trees/${treeId}/relationships`, {
    fromNodeId, toNodeId, type, ...extra,
  });
  return data;
}

export function getExportUrl(treeId: string): string {
  const base = (import.meta.env.VITE_FAMILY_TREE_API_URL as string) || 'http://localhost:3005';
  return `${base}/trees/${treeId}/export`;
}
