import topicsRaw from "@/data/topics.json";
import { buildGraph } from "@/lib/graph";
import type { RawTopics } from "@/lib/types";
import KnowledgeGraphPage from "@/components/KnowledgeGraphPage";

export default function Page() {
  const graph = buildGraph(topicsRaw as unknown as RawTopics);
  return <KnowledgeGraphPage graph={graph} />;
}
