import { KnowledgeGraph } from '@/components/KnowledgeGraph';
import graphData from '@/data/graph.json';

export default function Page() {
  return <KnowledgeGraph data={graphData} />;
}
