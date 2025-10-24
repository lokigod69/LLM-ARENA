// Oracle API: Configurable Debate Analysis & Insight Extraction Engine
// Phase 1.1 Implementation: Architectural refactor with separated verdict system
// Enhanced neutrality enforcement and comprehensive bias detection

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { v4 as uuidv4 } from 'uuid';
import type { Message } from '@/types';
import type { ModelPersonality } from '@/hooks/useDebate';
import type { 
  OracleConfig, 
  OracleResult, 
  OracleAnalysisRequest,
  OracleLens,
  OracleOutputFormat,
  VerdictScope,
  BiasDetection 
} from '@/types/oracle';

// CORE NEUTRALITY: Always enforced for Oracle objectivity
const ORACLE_NEUTRALITY_DIRECTIVE = `
You are an objective analytical engine. Your analysis must be:
- Culturally neutral (avoid Western/American/European bias)
- Politically neutral (no left/right/liberal/conservative leaning)
- Methodologically rigorous (evidence-based conclusions only)
- Free from personal values or ideological frameworks
- Focused on structural and logical qualities of arguments

Analyze purely based on the specified lens criteria without injecting your own biases.
Do not let your training preferences influence the analysis.
`;

// Lens-specific prompt templates - UPDATED: Removed verdict logic
const LENS_PROMPTS: Record<OracleLens, string> = {
  scientific: `Analyze this debate through a SCIENTIFIC lens:
• What empirical claims were made? Are they supported by credible evidence?
• What methodologies, studies, or data were referenced?
• Which arguments rely on verifiable facts vs opinions or speculation?
• Are there testable hypotheses that emerged from the discussion?
• What specific research would be needed to settle disputed claims?
• Identify any scientific misconceptions or inaccuracies.

Focus purely on scientific merit and evidence quality.`,

  philosophical: `Examine this debate through a PHILOSOPHICAL lens:
• What fundamental assumptions about reality, knowledge, or ethics underlie each position?
• How do their core worldviews and value systems differ?
• What deeper existential or moral questions does this topic reveal?
• Which philosophical frameworks or traditions are reflected in their reasoning?
• What would major philosophers (ancient and modern) contribute to this discussion?
• Identify the philosophical implications that extend beyond the immediate topic.

Focus purely on philosophical depth and conceptual rigor.`,

  logical: `Analyze this debate through a LOGICAL lens:
• Map the logical structure of each participant's arguments.
• Identify any logical fallacies, weak reasoning, or invalid inferences.
• Which premises are strongest and which are questionable?
• Are conclusions properly supported by the presented premises?
• Where did reasoning become circular, inconsistent, or break down?
• Evaluate the overall coherence and validity of each argumentative approach.

Focus purely on reasoning quality and logical soundness.`,

  practical: `Examine this debate through a PRACTICAL lens:
• How do these ideas translate into real-world applications and consequences?
• What specific actions should people take based on these insights?
• Which approach would be more effective or beneficial in practice?
• What are the concrete costs, benefits, and trade-offs of each position?
• How can this knowledge be immediately useful for decision-making?
• Identify actionable takeaways and implementation strategies.

Focus purely on real-world applicability and practical value.`,

  factual: `Analyze this debate through a FACTUAL lens:
• Extract only verifiable, objective claims made by each participant.
• What supporting evidence was provided for factual assertions?
• Identify claims that can be fact-checked or independently verified.
• Separate facts from opinions, interpretations, and speculation.
• What key information or data points emerged as most reliable?
• Note any factual errors, inconsistencies, or unsupported claims.

Focus purely on factual accuracy and evidence quality.`,

  meta: `Examine this debate through a META lens (analyzing the process itself):
• How did the structure and flow of the debate affect the outcomes?
• What important topics or angles were avoided or insufficiently explored?
• Where did participants talk past each other or miss key points?
• What blind spots or biases influenced the discussion?
• How did their personality settings affect their engagement style?
• What questions should have been asked but weren't?
• Analyze the quality of the intellectual discourse itself.

Focus purely on the debate process and structural dynamics.`
};

// Depth level modifiers
const DEPTH_MODIFIERS: Record<number, string> = {
  1: "Provide a concise analysis focusing only on the most obvious main points.",
  2: "Give a straightforward analysis covering key insights without excessive detail.",
  3: "Conduct a thorough analysis with supporting context and explanations.",
  4: "Provide a comprehensive analysis exploring nuances, implications, and deeper layers.",
  5: "Conduct an exhaustive analysis leaving no aspect unexplored, including subtle implications and edge cases."
};

// Output format instructions - UPDATED: Lens-neutral presentation
const FORMAT_INSTRUCTIONS: Record<OracleOutputFormat, string> = {
  narrative: `Present your analysis as a flowing 2-3 paragraph narrative summary that integrates all insights from the lens perspective. Read like an insightful analysis piece.`,
  
  bullets: `Structure your analysis as clear, well-organized bullet points:
• Key Discovery 1: [specific insight from lens analysis]
• Key Discovery 2: [specific insight from lens analysis]
• Main Takeaway: [overall conclusion from lens perspective]
Use sub-bullets for supporting details when necessary.`,

  main_argument: `Distill your entire analysis into ONE core argument or conclusion from the lens perspective. What is the single most important insight that emerged? Present this as a clear, compelling thesis statement with brief supporting reasoning.`,

  puzzle_pieces: `Present your insights as distinct, standalone pieces that can be combined with other analyses:
🧩 Insight 1: [independent discovery from lens perspective]
🧩 Insight 2: [independent discovery from lens perspective]  
🧩 Insight 3: [independent discovery from lens perspective]
Each piece should be valuable on its own but collectively form a larger picture.`,

  gap_analysis: `Analyze what's problematic, missing, or inadequate from the lens perspective:
❌ What's Wrong: [identify flaws, errors, or weak reasoning through lens]
❓ What's Missing: [important aspects not addressed from lens viewpoint]
⚠️ What's Questionable: [claims needing more scrutiny according to lens criteria]
🔍 Deeper Issues: [underlying problems identified through lens examination]`
};

// NEW: Separate verdict system based on scope
const getVerdictPrompt = (scope: VerdictScope, lens: OracleLens): string => {
  if (scope === 'lens') {
    return `
LENS-SPECIFIC VERDICT:
Based SOLELY on ${lens.toUpperCase()} criteria from your analysis above:
- Which model performed better according to ${lens} standards?
- Provide confidence percentage (0-100%)
- Give specific reasoning based only on ${lens} factors
- Ignore other analytical dimensions

Format as:
Winner: [GPT/Claude/Aligned]
Confidence: [X]%
Reasoning: [Brief explanation focused only on ${lens} criteria]
`;
  } else if (scope === 'meta') {
    return `
META VERDICT:
Step back and analyze from ALL analytical perspectives:
- Consider factual accuracy, logical coherence, philosophical depth, practical value, etc.
- Which model was stronger when considering multiple dimensions?
- Provide confidence percentage (0-100%)
- Give reasoning that synthesizes across multiple analytical perspectives
- This is a holistic assessment beyond just the primary lens

Format as:
Winner: [GPT/Claude/Aligned]
Confidence: [X]%
Reasoning: [Brief explanation considering multiple analytical dimensions]
`;
  }
  return '';
};

// NEW: Enhanced bias detection prompts
const getBiasDetectionPrompt = (biasConfig: BiasDetection): string => {
  if (!biasConfig.enabled) return '';
  
  let prompt = '\n\nEXPERIMENTAL BIAS ANALYSIS:\n';
  
  if (biasConfig.analyzeDebaterBias) {
    prompt += `
DEBATER BIAS ANALYSIS:
- Did either model show political bias (liberal/conservative leaning)?
- Were there ideological assumptions or value judgments?
- Did either model avoid certain perspectives unfairly?
- What implicit worldviews or political frameworks were revealed?
`;
  }
  
  if (biasConfig.analyzeCensorship) {
    prompt += `
CENSORSHIP ANALYSIS:
- Were any topics avoided or sanitized due to safety filters?
- Did either model self-censor or give obviously filtered responses?
- What important aspects were left unexplored?
- Were there signs of training limitations or guardrail interference?
`;
  }
  
  if (biasConfig.culturalBiasCheck) {
    prompt += `
CULTURAL BIAS ANALYSIS:
- Were there Western-centric or culturally specific assumptions?
- Did either model default to particular cultural frameworks?
- Were diverse global perspectives considered?
- What cultural blind spots were evident?
`;
  }
  
  if (biasConfig.politicalBiasCheck) {
    prompt += `
POLITICAL BIAS ANALYSIS:
- Did responses lean left/right politically?
- Were there partisan assumptions or talking points?
- How did models handle politically charged aspects?
- What political biases were revealed in reasoning?
`;
  }
  
  return prompt;
};

// NEW: Comprehensive prompt builder
const buildOraclePrompt = (
  request: OracleAnalysisRequest,
  config: OracleConfig
): string => {
  let prompt = ORACLE_NEUTRALITY_DIRECTIVE + '\n\n';
  
  // Add lens-specific analysis
  prompt += LENS_PROMPTS[config.primaryLens] + '\n\n';
  
  // Add depth instructions
  prompt += DEPTH_MODIFIERS[config.depthLevel] + '\n\n';
  
  // Add format instructions
  prompt += FORMAT_INSTRUCTIONS[config.outputFormat] + '\n\n';
  
  // Add debate content
  prompt += `DEBATE TOPIC: "${request.topic}"\n\n`;
  prompt += `TOTAL TURNS: ${request.totalTurns}\n\n`;
  
  // Add GPT messages
  prompt += "GPT-4 RESPONSES:\n";
  request.gptMessages.forEach((msg, index) => {
    prompt += `Turn ${index + 1}: ${msg.text}\n\n`;
  });
  
  // Add Claude messages
  prompt += "CLAUDE RESPONSES:\n";
  request.claudeMessages.forEach((msg, index) => {
    prompt += `Turn ${index + 1}: ${msg.text}\n\n`;
  });
  
  // Add verdict if enabled
  if (config.verdict.enabled && config.verdict.scope !== 'disabled') {
    prompt += getVerdictPrompt(config.verdict.scope, config.primaryLens);
  }
  
  // Add bias detection if enabled
  prompt += getBiasDetectionPrompt(config.biasDetection);
  
  return prompt;
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body: OracleAnalysisRequest & { accessCode?: string } = await request.json();
    const { topic, gptMessages, claudeMessages, gptPersonality, claudePersonality, totalTurns, config } = body;
    const accessCode = (body as any).accessCode as string | undefined;

    console.log('🔮 ORACLE v1.1: Starting configurable analysis...', {
      topic: topic.substring(0, 50) + '...',
      primaryLens: config.primaryLens,
      depthLevel: config.depthLevel,
      outputFormat: config.outputFormat,
      verdictScope: config.verdict.scope,
      biasDetectionEnabled: config.biasDetection.enabled,
      totalTurns
    });

    // Access code quota handling (consume 1 credit per analysis unless admin)
    let queriesRemaining: number | string = 'Unlimited';
    if (accessCode && accessCode !== process.env.ADMIN_ACCESS_CODE) {
      type CodeData = { queries_allowed: number; queries_remaining: number; isActive: boolean; created_at: string };
      const codeData = await kv.get<CodeData>(accessCode);
      if (!codeData || !codeData.isActive || codeData.queries_remaining <= 0) {
        return NextResponse.json({ success: false, error: 'Access denied. Invalid or expired code.' }, { status: 403 });
      }
      const newRemaining = codeData.queries_remaining - 1;
      await kv.set(accessCode, { ...codeData, queries_remaining: newRemaining });
      queriesRemaining = newRemaining;
    }

    // Check if we're in mock mode
    const MOCK_MODE = process.env.MOCK_MODE === 'true';
    
    let result: OracleResult;

    if (MOCK_MODE) {
      console.log('🎭 ORACLE MOCK MODE: Generating sophisticated analysis...');
      result = await generateMockAnalysis(body, startTime);
    } else {
      console.log('🤖 ORACLE REAL MODE: Using DeepSeek-Reasoner for analysis...');
      result = await generateRealAnalysis(body, startTime);
    }

    console.log('✅ ORACLE: Analysis complete', {
      id: result.id,
      processingTime: result.processingTime,
      verdictWinner: result.verdict?.winner,
      verdictScope: result.verdict?.scope,
      biasAnalysisIncluded: !!result.biasAnalysis,
      analysisLength: result.analysis.length
    });

    return NextResponse.json({ 
      success: true, 
      result,
      queriesRemaining
    });

  } catch (error) {
    console.error('❌ ORACLE ERROR:', error);
    return NextResponse.json({
      success: false,
      error: 'Oracle analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Mock analysis generation - UPDATED for new architecture
async function generateMockAnalysis(request: OracleAnalysisRequest, startTime: number): Promise<OracleResult> {
  const { topic, gptMessages, claudeMessages, config, totalTurns } = request;
  
  // Simulate processing time based on depth level
  const processingDelay = config.depthLevel * 300 + Math.random() * 500;
  await new Promise(resolve => setTimeout(resolve, processingDelay));
  
  // Generate analysis based on configuration
  const analysis = generateConfiguredAnalysis(config, topic, gptMessages.length, claudeMessages.length, totalTurns);
  
  // Generate verdict if enabled
  let verdict = undefined;
  if (config.verdict.enabled && config.verdict.scope !== 'disabled') {
    verdict = generateMockVerdict(gptMessages.length, claudeMessages.length, config.verdict.scope, config.primaryLens);
  }
  
  // Generate bias analysis if enabled
  let biasAnalysis = undefined;
  if (config.biasDetection.enabled) {
    biasAnalysis = generateMockBiasAnalysis(config.biasDetection);
  }
  
  return {
    id: uuidv4(),
    timestamp: new Date(),
    config,
    analysis,
    verdict,
    biasAnalysis,
    processingTime: Date.now() - startTime
  };
}

// Generate analysis based on configuration - UPDATED to simulate CoT reasoning
function generateConfiguredAnalysis(
  config: OracleConfig, 
  topic: string, 
  gptMessageCount: number, 
  claudeMessageCount: number,
  totalTurns: number
): string {
  // Simulate DeepSeek-Reasoner's Chain of Thought structure
  let analysis = `CHAIN OF THOUGHT ANALYSIS:

STEP 1 - CONTEXT UNDERSTANDING:
This debate about "${topic}" involved ${totalTurns} turns with ${gptMessageCount} GPT responses and ${claudeMessageCount} Claude responses. The core disagreement centers on fundamental approaches to understanding this topic.

STEP 2 - LENS APPLICATION (${config.primaryLens.toUpperCase()}):
${getLensContext(config.primaryLens, topic)}

STEP 3 - DEPTH ANALYSIS:
${getDepthContext(config.depthLevel)}

STEP 4 - PATTERN DETECTION:
Throughout the exchange, several patterns emerged:
- Different evidential standards between the models
- Varying approaches to handling uncertainty
- Distinct reasoning frameworks and methodological preferences
- Complementary but sometimes conflicting analytical approaches

STEP 5 - INSIGHT SYNTHESIS:
${getFormatTemplate(config.outputFormat)}

FINAL ANALYSIS:
`;

  // Add the formatted analysis based on configuration
  analysis += getFormatTemplate(config.outputFormat);
  
  return analysis;
}

// Lens-specific contextual analysis
function getLensContext(lens: OracleLens, topic: string): string {
  const contexts = {
    scientific: `From a SCIENTIFIC perspective on "${topic}": This debate revealed the importance of evidence-based reasoning. Both models presented claims, but their evidential support varied significantly. The discussion highlighted the need for empirical validation of theoretical positions.`,
    
    philosophical: `From a PHILOSOPHICAL perspective on "${topic}": This exchange exposed fundamental differences in underlying worldviews. The debate revealed deeper questions about the nature of truth, value systems, and how we construct meaning around complex topics.`,
    
    logical: `From a LOGICAL perspective on "${topic}": The argumentative structure showed interesting patterns. While both models maintained internal consistency, their reasoning approaches differed significantly in terms of premise selection and inferential strategies.`,
    
    practical: `From a PRACTICAL perspective on "${topic}": This discussion generated actionable insights for real-world application. The debate illuminated concrete consequences and implementation strategies that could guide practical decision-making.`,
    
    factual: `From a FACTUAL perspective on "${topic}": The exchange included numerous claims that warrant verification. This analysis focuses on extracting objective, verifiable information while separating facts from interpretations.`,
    
    meta: `From a META perspective on this debate about "${topic}": The discussion process itself revealed interesting dynamics. Both models' engagement patterns, topic selection, and avoidance behaviors provide insights into AI discourse limitations and capabilities.`
  };
  
  return contexts[lens];
}

// Depth-specific context
function getDepthContext(depth: number): string {
  const templates: Record<number, string> = {
    1: "KEY INSIGHT: The most obvious takeaway from this exchange was the fundamental disagreement about approach and methodology.",
    2: "MAIN DISCOVERIES: Several important patterns emerged, including different evidential standards and reasoning approaches between the models.",
    3: "COMPREHENSIVE ANALYSIS: The debate revealed multiple layers of complexity, from surface-level disagreements to deeper methodological differences and underlying assumptions.",
    4: "DEEP EXAMINATION: This exchange exposed nuanced intellectual dynamics, including subtle biases, unexplored implications, and sophisticated reasoning patterns that warrant careful consideration.",
    5: "EXHAUSTIVE INVESTIGATION: Every aspect of this debate deserves scrutiny, from obvious conclusions to subtle implications, unexpressed assumptions, contextual factors, and broader ramifications for understanding AI discourse."
  };
  
  return templates[depth] || templates[3];
}

// Format-specific templates
function getFormatTemplate(format: OracleOutputFormat): string {
  const templates = {
    narrative: "This debate illuminated several key dimensions of the topic. The exchange revealed that both perspectives contain valuable insights, though they approach the question from fundamentally different angles. The discussion generated practical wisdom that transcends the original positions.",
    
    bullets: `• Primary Discovery: The debate revealed underlying methodological differences
• Secondary Insight: Both models demonstrated sophisticated but distinct reasoning approaches  
• Key Takeaway: The exchange generated insights that neither model likely would have reached independently
• Practical Implication: These findings suggest new approaches to understanding the topic`,
    
    main_argument: "CORE CONCLUSION: This debate demonstrated that the most valuable insights emerge not from winning arguments, but from the intellectual friction between well-reasoned but different perspectives.",
    
    puzzle_pieces: `🧩 Methodological Insight: Different approaches can reach similar conclusions through different paths
🧩 Reasoning Pattern: Both models showed sophisticated but distinct logical frameworks
🧩 Synthesis Opportunity: The combination of perspectives revealed new angles not visible to either alone
🧩 Meta-Discovery: AI debate generates emergent insights beyond individual model capabilities`,
    
    gap_analysis: `❌ What's Problematic: Some arguments relied on unstated assumptions that weren't adequately examined
❓ What's Missing: Important counterarguments and edge cases were not thoroughly explored
⚠️ What's Questionable: Certain claims would benefit from additional evidence or clarification
🔍 Deeper Issues: The debate structure may have prevented exploration of more radical alternatives`
  };
  
  return templates[format];
}

// Generate mock verdict - UPDATED with scope
function generateMockVerdict(gptCount: number, claudeCount: number, scope: VerdictScope, lens: OracleLens): any {
  const total = gptCount + claudeCount;
  const difference = Math.abs(gptCount - claudeCount);
  
  let winner: 'GPT' | 'Claude' | 'Aligned';
  let confidence: number;
  
  if (difference <= 1 || total < 4) {
    winner = 'Aligned';
    confidence = 60 + Math.random() * 20;
  } else if (gptCount > claudeCount) {
    winner = 'GPT';
    confidence = 65 + (difference * 5) + Math.random() * 15;
  } else {
    winner = 'Claude';
    confidence = 65 + (difference * 5) + Math.random() * 15;
  }
  
  const reasoningSuffix = scope === 'lens' 
    ? `based on ${lens} criteria specifically`
    : 'based on comprehensive multi-dimensional analysis';
  
  return {
    winner,
    confidence: Math.round(Math.min(95, confidence)),
    reasoning: `Superior performance ${reasoningSuffix} across ${total} exchanges.`,
    scope
  };
}

// NEW: Generate mock bias analysis
function generateMockBiasAnalysis(biasConfig: BiasDetection): any {
  const analysis: any = {};
  
  if (biasConfig.analyzeDebaterBias) {
    analysis.debaterBias = "Both models showed relatively balanced approaches, though GPT exhibited slight risk-aversion in controversial areas while Claude displayed more willingness to engage with edge cases.";
  }
  
  if (biasConfig.analyzeCensorship) {
    analysis.censorship = "Minor topic sanitization detected around politically sensitive areas, with both models defaulting to safer formulations when discussing contentious subjects.";
  }
  
  if (biasConfig.culturalBiasCheck) {
    analysis.culturalBias = "Some Western-centric assumptions were evident in both models' reasoning frameworks, particularly around individualism vs. collectivism and democratic values.";
  }
  
  if (biasConfig.politicalBiasCheck) {
    analysis.politicalBias = "No strong political bias detected, though both models showed slight preference for centrist positions and avoided extreme political viewpoints.";
  }
  
  return analysis;
}

// Real AI analysis (for when API keys are available) - PHASE B: Flexible model support
async function generateRealAnalysis(request: OracleAnalysisRequest, startTime: number): Promise<OracleResult> {
  const selectedModel = request.config.oracleModel;
  console.log(`🤖 ORACLE REAL MODE: Using ${selectedModel} for analysis...`);
  
  try {
    // Import the Flexible Oracle function - PHASE B: Enhanced with model selection
    const { callFlexibleOracle } = await import('@/lib/orchestrator');
    
    // Build the enhanced Oracle prompt with CoT instructions
    const oraclePrompt = buildEnhancedOraclePrompt(request, request.config);
    
    console.log(`🔮 ORACLE: Calling ${selectedModel} with enhanced prompt...`, {
      promptLength: oraclePrompt.length,
      oracleModel: selectedModel,
      lens: request.config.primaryLens,
      depth: request.config.depthLevel,
      format: request.config.outputFormat
    });
    
    // Get analysis from selected Oracle model - PHASE B: Flexible model support
    const analysis = await callFlexibleOracle(oraclePrompt, selectedModel);
    
    console.log(`✅ ORACLE: ${selectedModel} analysis received`, {
      analysisLength: analysis.length,
      processingTime: Date.now() - startTime,
      modelUsed: selectedModel
    });
    
    // Parse the analysis to extract different components
    const parsedResult = parseDeepSeekAnalysis(analysis, request.config);
    
    return {
      id: uuidv4(),
      timestamp: new Date(),
      config: request.config,
      analysis: parsedResult.analysis,
      verdict: parsedResult.verdict,
      biasAnalysis: parsedResult.biasAnalysis,
      processingTime: Date.now() - startTime
    };
    
  } catch (error) {
    console.error('❌ ORACLE REAL ANALYSIS ERROR:', error);
    
    // Fallback to mock analysis if real analysis fails
    console.log('🔄 ORACLE: Falling back to mock analysis due to error');
    return generateMockAnalysis(request, startTime);
  }
}

/**
 * Build enhanced Oracle prompt with Chain of Thought instructions for DeepSeek-Reasoner
 */
function buildEnhancedOraclePrompt(request: OracleAnalysisRequest, config: OracleConfig): string {
  let prompt = `${ORACLE_NEUTRALITY_DIRECTIVE}

CHAIN OF THOUGHT ANALYSIS REQUIRED:
Think step-by-step through your analysis. Show your reasoning process explicitly.

STEP 1 - CONTEXT UNDERSTANDING:
First, understand what this debate is really about. What are the core positions and disagreements?

STEP 2 - LENS APPLICATION:
${LENS_PROMPTS[config.primaryLens]}

STEP 3 - DEPTH ANALYSIS:
${DEPTH_MODIFIERS[config.depthLevel]}

STEP 4 - PATTERN DETECTION:
Look for recurring themes, logical patterns, biases, and argumentative structures throughout the exchange.

STEP 5 - INSIGHT SYNTHESIS:
${FORMAT_INSTRUCTIONS[config.outputFormat]}

DEBATE CONTENT TO ANALYZE:
Topic: "${request.topic}"
Total Turns: ${request.totalTurns}

GPT-4 RESPONSES:`;

  request.gptMessages.forEach((msg, index) => {
    prompt += `\nTurn ${index + 1}: ${msg.text}`;
  });

  prompt += `\n\nCLAUDE RESPONSES:`;
  request.claudeMessages.forEach((msg, index) => {
    prompt += `\nTurn ${index + 1}: ${msg.text}`;
  });

  // Add verdict analysis if enabled
  if (config.verdict.enabled && config.verdict.scope !== 'disabled') {
    prompt += `\n\nSTEP 6 - VERDICT ANALYSIS:
${getVerdictPrompt(config.verdict.scope, config.primaryLens)}`;
  }

  // Add bias detection if enabled
  if (config.biasDetection.enabled) {
    prompt += `\n\nSTEP 7 - BIAS DETECTION:
${getBiasDetectionPrompt(config.biasDetection)}`;
  }

  prompt += `\n\nPROCEED WITH CHAIN OF THOUGHT ANALYSIS:
Think through each step explicitly, then provide your comprehensive analysis.`;

  return prompt;
}

/**
 * Parse DeepSeek analysis to extract components (analysis, verdict, bias detection)
 */
function parseDeepSeekAnalysis(analysis: string, config: OracleConfig): {
  analysis: string;
  verdict?: any;
  biasAnalysis?: any;
} {
  // For now, return the full analysis
  // In the future, could parse specific sections if DeepSeek uses structured output
  const result: any = {
    analysis: analysis
  };

  // Try to extract verdict if enabled (simple parsing for now)
  if (config.verdict.enabled && config.verdict.scope !== 'disabled') {
    const verdictMatch = analysis.match(/Winner:\s*(GPT|Claude|Aligned)[\s\S]*?Confidence:\s*(\d+)%[\s\S]*?Reasoning:\s*([^\n]+)/i);
    if (verdictMatch) {
      result.verdict = {
        winner: verdictMatch[1],
        confidence: parseInt(verdictMatch[2]),
        reasoning: verdictMatch[3].trim(),
        scope: config.verdict.scope
      };
    }
  }

  // Try to extract bias analysis if enabled (simple parsing for now)
  if (config.biasDetection.enabled) {
    const biasAnalysis: any = {};
    
    if (config.biasDetection.analyzeDebaterBias) {
      const debaterBiasMatch = analysis.match(/(?:debater bias|political bias)[:\s]*(.*?)(?:\n\n|\n[A-Z]|$)/i);
      if (debaterBiasMatch) {
        biasAnalysis.debaterBias = debaterBiasMatch[1].trim();
      }
    }
    
    if (config.biasDetection.analyzeCensorship) {
      const censorshipMatch = analysis.match(/(?:censorship|topic avoided?)[:\s]*(.*?)(?:\n\n|\n[A-Z]|$)/i);
      if (censorshipMatch) {
        biasAnalysis.censorship = censorshipMatch[1].trim();
      }
    }
    
    if (config.biasDetection.culturalBiasCheck) {
      const culturalMatch = analysis.match(/(?:cultural bias|western.{0,20}centric)[:\s]*(.*?)(?:\n\n|\n[A-Z]|$)/i);
      if (culturalMatch) {
        biasAnalysis.culturalBias = culturalMatch[1].trim();
      }
    }
    
    if (config.biasDetection.politicalBiasCheck) {
      const politicalMatch = analysis.match(/(?:political bias|left.{0,10}right)[:\s]*(.*?)(?:\n\n|\n[A-Z]|$)/i);
      if (politicalMatch) {
        biasAnalysis.politicalBias = politicalMatch[1].trim();
      }
    }
    
    if (Object.keys(biasAnalysis).length > 0) {
      result.biasAnalysis = biasAnalysis;
    }
  }

  return result;
} 