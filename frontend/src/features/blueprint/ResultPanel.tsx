import { motion } from "framer-motion";
import type { Blueprint } from "@/types/domain";
import {
  IdeaClarificationRenderer,
  TechStackRenderer,
  ArchitectureRenderer,
  DatabaseSchemaRenderer,
  APIDesignRenderer,
  RoadmapRenderer,
  SecurityRenderer,
  TestingRenderer,
  DocumentationRenderer,
} from "./SectionRenderers";

interface ResultPanelProps {
  blueprint: Blueprint;
}

const container = {
  animate: { transition: { staggerChildren: 0.07 } },
};

export function ResultPanel({ blueprint }: ResultPanelProps) {
  const s = blueprint.sections;

  return (
    <motion.div
      variants={container}
      initial="initial"
      animate="animate"
      className="space-y-4"
    >
      {s.idea_clarification && <IdeaClarificationRenderer data={s.idea_clarification} />}
      {s.tech_stack && <TechStackRenderer data={s.tech_stack} />}
      {s.architecture && <ArchitectureRenderer data={s.architecture} />}
      {s.database_schema && <DatabaseSchemaRenderer data={s.database_schema} />}
      {s.api_design && <APIDesignRenderer data={s.api_design} />}
      {s.implementation_roadmap && <RoadmapRenderer data={s.implementation_roadmap} />}
      {s.security_deployment && <SecurityRenderer data={s.security_deployment} />}
      {s.testing_strategy && <TestingRenderer data={s.testing_strategy} />}
      {s.documentation && <DocumentationRenderer data={s.documentation} />}
    </motion.div>
  );
}
