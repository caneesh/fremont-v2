/**
 * Curriculum Audit Service
 *
 * Checks content for pedagogical integrity:
 * - Drift toward explanation over inquiry
 * - Over-scaffolding
 * - Hint dependency risk
 * - Formula leakage
 * - Loss of transfer emphasis
 */

import type {
  ContentPack,
  ConceptCard,
  MisconceptionCard,
  ProblemArchetype,
  SocraticTree,
  MasteryCheck,
  CurriculumAuditResult,
  AuditRiskType,
} from '@/types/atomicLearning';

// =============================================================================
// AUDIT RULES
// =============================================================================

interface AuditRule {
  id: string;
  riskType: AuditRiskType;
  description: string;
  check: (content: unknown) => { passed: boolean; details?: string };
}

// =============================================================================
// EXPLANATION OVER INQUIRY DETECTION
// =============================================================================

const EXPLANATION_PATTERNS = [
  /^The answer is/i,
  /^This means that/i,
  /^Therefore,/i,
  /^We can conclude/i,
  /^It follows that/i,
  /^Simply put,/i,
  /^In other words,/i,
];

function checkExplanationOverInquiry(content: string): { passed: boolean; details?: string } {
  for (const pattern of EXPLANATION_PATTERNS) {
    if (pattern.test(content)) {
      return {
        passed: false,
        details: `Found explanation pattern: "${content.substring(0, 50)}..."`,
      };
    }
  }
  return { passed: true };
}

// =============================================================================
// OVER-SCAFFOLDING DETECTION
// =============================================================================

function checkOverScaffolding(archetype: ProblemArchetype): { passed: boolean; details?: string } {
  // Too many steps in strategy
  if (archetype.stepStrategy.length > 7) {
    return {
      passed: false,
      details: `Step strategy has ${archetype.stepStrategy.length} steps (max recommended: 7)`,
    };
  }

  // Check if every step has explicit insight (might be spoon-feeding)
  const stepsWithInsight = archetype.stepStrategy.filter((s) => s.insight.length > 100);
  if (stepsWithInsight.length === archetype.stepStrategy.length) {
    return {
      passed: false,
      details: 'Every step has extensive insight explanation; consider reducing for student discovery',
    };
  }

  return { passed: true };
}

// =============================================================================
// HINT DEPENDENCY DETECTION
// =============================================================================

function checkHintDependency(tree: SocraticTree): { passed: boolean; details?: string } {
  // Check fading progression
  const fadePhases = tree.fadingProgression;

  if (fadePhases.length === 0) {
    return {
      passed: false,
      details: 'No fading progression defined; hints may create dependency',
    };
  }

  // Check if all phases are high support
  const allHigh = fadePhases.every((p) => p.fadingLevel === 'high');
  if (allHigh) {
    return {
      passed: false,
      details: 'All fading phases are high support; no independence building',
    };
  }

  // Check for proper progression (high → medium → low)
  const levels = fadePhases.map((p) => p.fadingLevel);
  const properProgression =
    levels.includes('high') &&
    levels.includes('low') &&
    levels.indexOf('high') < levels.indexOf('low');

  if (!properProgression) {
    return {
      passed: false,
      details: 'Fading progression does not follow high → low pattern',
    };
  }

  return { passed: true };
}

// =============================================================================
// FORMULA LEAKAGE DETECTION
// =============================================================================

const FORMULA_PATTERNS = [
  /[A-Za-z]\s*=\s*[A-Za-z0-9+\-*/()]+/,  // Variable = expression
  /\d+\s*[+\-*/]\s*\d+/,                   // Numerical calculation
  /\\frac\{/,                               // LaTeX fractions
  /\\sqrt\{/,                               // LaTeX square root
];

function checkFormulaLeakage(content: string, allowedContext: 'never' | 'examples_only'): { passed: boolean; details?: string } {
  if (allowedContext === 'never') {
    for (const pattern of FORMULA_PATTERNS) {
      if (pattern.test(content)) {
        return {
          passed: false,
          details: `Formula detected where not allowed: "${content.substring(0, 50)}..."`,
        };
      }
    }
  }
  return { passed: true };
}

// =============================================================================
// TRANSFER EMPHASIS CHECK
// =============================================================================

function checkTransferEmphasis(archetype: ProblemArchetype): { passed: boolean; details?: string } {
  // Must have a transfer variant
  if (!archetype.transferVariant) {
    return {
      passed: false,
      details: 'No transfer variant defined for problem archetype',
    };
  }

  // Transfer variant must preserve deep structure
  if (!archetype.transferVariant.deepStructurePreserved) {
    return {
      passed: false,
      details: 'Transfer variant does not specify preserved deep structure',
    };
  }

  // Transfer variant must have surface change
  if (!archetype.transferVariant.surfaceChange) {
    return {
      passed: false,
      details: 'Transfer variant does not specify surface change',
    };
  }

  return { passed: true };
}

// =============================================================================
// MAIN AUDIT FUNCTION
// =============================================================================

export function auditContentPack(pack: ContentPack): CurriculumAuditResult {
  const risks: CurriculumAuditResult['risks'] = [];
  const recommendations: string[] = [];

  // Audit concept card
  const conceptCheck = checkExplanationOverInquiry(pack.conceptCard.mentalModel.description);
  if (!conceptCheck.passed) {
    risks.push({
      type: 'explanation_over_inquiry',
      severity: 'medium',
      location: `ConceptCard: ${pack.conceptCard.id}`,
      description: conceptCheck.details || 'Explanation pattern detected',
    });
  }

  // Audit misconception cards
  for (const mc of pack.misconceptionCards) {
    // Refutation strategy should be questions only
    const probeCheck = checkExplanationOverInquiry(mc.refutationStrategy.probe);
    if (!probeCheck.passed) {
      risks.push({
        type: 'explanation_over_inquiry',
        severity: 'high',
        location: `MisconceptionCard: ${mc.id}`,
        description: 'Refutation probe contains explanation instead of question',
      });
    }

    // Check for formula in exposure questions
    for (const question of mc.exposureQuestions) {
      const formulaCheck = checkFormulaLeakage(question, 'never');
      if (!formulaCheck.passed) {
        risks.push({
          type: 'formula_leakage',
          severity: 'medium',
          location: `MisconceptionCard: ${mc.id}`,
          description: formulaCheck.details || 'Formula in Socratic question',
        });
      }
    }
  }

  // Audit problem archetypes
  for (const pa of pack.problemArchetypes) {
    // Check over-scaffolding
    const scaffoldCheck = checkOverScaffolding(pa);
    if (!scaffoldCheck.passed) {
      risks.push({
        type: 'over_scaffolding',
        severity: 'medium',
        location: `ProblemArchetype: ${pa.id}`,
        description: scaffoldCheck.details || 'Over-scaffolding detected',
      });
    }

    // Check transfer emphasis
    const transferCheck = checkTransferEmphasis(pa);
    if (!transferCheck.passed) {
      risks.push({
        type: 'transfer_loss',
        severity: 'high',
        location: `ProblemArchetype: ${pa.id}`,
        description: transferCheck.details || 'Transfer emphasis missing',
      });
      recommendations.push(`Add transfer variant to ${pa.id} with clear surface change and preserved deep structure`);
    }

    // Check formula in step strategy
    for (const step of pa.stepStrategy) {
      const formulaCheck = checkFormulaLeakage(step.reasoning, 'never');
      if (!formulaCheck.passed) {
        risks.push({
          type: 'formula_leakage',
          severity: 'medium',
          location: `ProblemArchetype: ${pa.id}, Step ${step.step}`,
          description: 'Formula in reasoning step (should be conceptual)',
        });
      }
    }
  }

  // Audit Socratic trees
  for (const st of pack.socraticTrees) {
    // Check hint dependency
    const hintCheck = checkHintDependency(st);
    if (!hintCheck.passed) {
      risks.push({
        type: 'hint_dependency',
        severity: 'high',
        location: `SocraticTree: ${st.id}`,
        description: hintCheck.details || 'Hint dependency risk',
      });
      recommendations.push(`Implement proper fading progression (high → medium → low) in ${st.id}`);
    }

    // Check all nodes for explanation
    for (const [nodeId, node] of Object.entries(st.nodes)) {
      const explCheck = checkExplanationOverInquiry(node.question);
      if (!explCheck.passed) {
        risks.push({
          type: 'explanation_over_inquiry',
          severity: 'high',
          location: `SocraticTree: ${st.id}, Node: ${nodeId}`,
          description: 'Socratic node contains explanation instead of question',
        });
      }
    }
  }

  // Audit mastery checks
  for (const check of Object.values(pack.masteryCheckSet.checks)) {
    // Mastery checks should not have numerical answers
    const formulaCheck = checkFormulaLeakage(check.prompt, 'never');
    if (!formulaCheck.passed) {
      risks.push({
        type: 'formula_leakage',
        severity: 'low',
        location: `MasteryCheck: ${check.id}`,
        description: 'Formula in mastery check prompt',
      });
    }
  }

  // Determine overall risk level
  let riskLevel: CurriculumAuditResult['riskLevel'] = 'low';
  const highRisks = risks.filter((r) => r.severity === 'high').length;
  const mediumRisks = risks.filter((r) => r.severity === 'medium').length;

  if (highRisks >= 3 || risks.some((r) => r.severity === 'high' && r.type === 'explanation_over_inquiry')) {
    riskLevel = 'critical';
  } else if (highRisks >= 1) {
    riskLevel = 'high';
  } else if (mediumRisks >= 3) {
    riskLevel = 'medium';
  }

  return {
    contentId: pack.id,
    riskLevel,
    risks,
    recommendations,
    approved: riskLevel === 'low',
  };
}

// =============================================================================
// INDIVIDUAL AUDITS
// =============================================================================

export function auditConceptCard(card: ConceptCard): CurriculumAuditResult['risks'] {
  const risks: CurriculumAuditResult['risks'] = [];

  // Check for explanation patterns
  const check = checkExplanationOverInquiry(card.mentalModel.description);
  if (!check.passed) {
    risks.push({
      type: 'explanation_over_inquiry',
      severity: 'medium',
      location: card.id,
      description: check.details || 'Explanation pattern detected',
    });
  }

  // Check analogies for formula leakage
  for (const analogy of card.mentalModel.analogies) {
    const formulaCheck = checkFormulaLeakage(analogy, 'never');
    if (!formulaCheck.passed) {
      risks.push({
        type: 'formula_leakage',
        severity: 'low',
        location: card.id,
        description: 'Formula in analogy',
      });
    }
  }

  return risks;
}

export function auditSocraticTree(tree: SocraticTree): CurriculumAuditResult['risks'] {
  const risks: CurriculumAuditResult['risks'] = [];

  // Check hint dependency
  const hintCheck = checkHintDependency(tree);
  if (!hintCheck.passed) {
    risks.push({
      type: 'hint_dependency',
      severity: 'high',
      location: tree.id,
      description: hintCheck.details || 'Hint dependency risk',
    });
  }

  // Check all nodes
  for (const [nodeId, node] of Object.entries(tree.nodes)) {
    const explCheck = checkExplanationOverInquiry(node.question);
    if (!explCheck.passed) {
      risks.push({
        type: 'explanation_over_inquiry',
        severity: 'high',
        location: `${tree.id}/${nodeId}`,
        description: explCheck.details || 'Explanation in Socratic node',
      });
    }
  }

  return risks;
}

// =============================================================================
// QUALITY REVIEW CHECKLIST
// =============================================================================

export interface QualityChecklistItem {
  id: string;
  category: string;
  check: string;
  passed: boolean;
  notes?: string;
}

export function generateQualityChecklist(pack: ContentPack): QualityChecklistItem[] {
  const checklist: QualityChecklistItem[] = [];

  // Pedagogy checks
  checklist.push({
    id: 'ped-1',
    category: 'Pedagogy',
    check: 'No formula-first explanations',
    passed: !pack.misconceptionCards.some((mc) =>
      FORMULA_PATTERNS.some((p) => p.test(mc.correctUnderstanding))
    ),
  });

  checklist.push({
    id: 'ped-2',
    category: 'Pedagogy',
    check: 'No direct answers in Socratic Trees',
    passed: pack.socraticTrees.every((st) =>
      Object.values(st.nodes).every((n) =>
        !EXPLANATION_PATTERNS.some((p) => p.test(n.question))
      )
    ),
  });

  checklist.push({
    id: 'ped-3',
    category: 'Pedagogy',
    check: 'Fading progression implemented',
    passed: pack.socraticTrees.every((st) =>
      st.fadingProgression.length >= 2
    ),
  });

  // Content checks
  checklist.push({
    id: 'cont-1',
    category: 'Content',
    check: 'Target insight clearly defined',
    passed: pack.targetInsight.length > 20,
  });

  checklist.push({
    id: 'cont-2',
    category: 'Content',
    check: 'At least 2 misconception cards',
    passed: pack.misconceptionCards.length >= 2,
  });

  checklist.push({
    id: 'cont-3',
    category: 'Content',
    check: 'Transfer variants defined for all archetypes',
    passed: pack.problemArchetypes.every((pa) => pa.transferVariant !== undefined),
  });

  // Structure checks
  checklist.push({
    id: 'str-1',
    category: 'Structure',
    check: 'All content has version info',
    passed: pack.version !== undefined,
  });

  checklist.push({
    id: 'str-2',
    category: 'Structure',
    check: 'Foundation classification present',
    passed: pack.conceptCard.foundationClassification !== undefined,
  });

  checklist.push({
    id: 'str-3',
    category: 'Structure',
    check: 'Difficulty scores complete',
    passed: pack.conceptCard.difficulty?.composite !== undefined,
  });

  return checklist;
}

// =============================================================================
// BATCH AUDIT
// =============================================================================

export function auditMultipleContentPacks(
  packs: ContentPack[]
): { summary: { total: number; approved: number; rejected: number }; results: CurriculumAuditResult[] } {
  const results = packs.map(auditContentPack);

  return {
    summary: {
      total: packs.length,
      approved: results.filter((r) => r.approved).length,
      rejected: results.filter((r) => !r.approved).length,
    },
    results,
  };
}
