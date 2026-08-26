export type AgeGroup = '6-10' | '11-14' | '15-17'
export type InterventionMode = 'blocked' | 'guided' | 'socratic' | 'collaborative'
export type ConfidenceLevel = 'low' | 'medium' | 'high'

export interface ResponsibleAIContext {
  ageGroup: AgeGroup
  grade?: string
  subject?: string
  studentName?: string
}

export interface PolicyDecision {
  mode: InterventionMode
  directAnswerAllowed: boolean
  requireStudentAttempt: boolean
  requireVerification: boolean
  maxSocraticQuestions: number
  guidance: string
}

export interface ExplainabilityRecord {
  reason: string
  confidence: ConfidenceLevel
  evidence: string[]
  humanReviewRecommended: boolean
}

const ANSWER_SEEKING_PATTERNS = [
  /me (dá|de|fala|manda) (a )?resposta/i,
  /qual (é|e) a resposta/i,
  /faz pra mim/i,
  /resolva pra mim/i,
  /responde pra mim/i,
  /só a resposta/i,
]

export function resolveAgePolicy(ctx: ResponsibleAIContext): PolicyDecision {
  if (ctx.ageGroup === '6-10') {
    return {
      mode: 'guided',
      directAnswerAllowed: false,
      requireStudentAttempt: true,
      requireVerification: true,
      maxSocraticQuestions: 1,
      guidance: 'Use linguagem simples, exemplos concretos, passos curtos e forte mediação. Não entregue respostas prontas; privilegie descoberta guiada e atividades fora da tela quando possível.',
    }
  }

  if (ctx.ageGroup === '11-14') {
    return {
      mode: 'socratic',
      directAnswerAllowed: false,
      requireStudentAttempt: true,
      requireVerification: true,
      maxSocraticQuestions: 2,
      guidance: 'Use investigação socrática, pistas graduais e explicações curtas. Exija participação intelectual antes de concluir a solução.',
    }
  }

  return {
    mode: 'collaborative',
    directAnswerAllowed: true,
    requireStudentAttempt: true,
    requireVerification: true,
    maxSocraticQuestions: 2,
    guidance: 'Permita colaboração mais avançada, mas preserve autoria, pensamento crítico, verificação de fontes e explicitação de limites da IA.',
  }
}

export function detectAnswerSeeking(message: string): boolean {
  return ANSWER_SEEKING_PATTERNS.some(pattern => pattern.test(message))
}

export function cognitiveEffortGuard(message: string, ctx: ResponsibleAIContext): string {
  const policy = resolveAgePolicy(ctx)
  if (!detectAnswerSeeking(message)) return ''

  if (!policy.directAnswerAllowed) {
    return `COGNITIVE EFFORT GUARD: O estudante parece pedir uma resposta pronta. Não entregue a solução final. Peça primeiro uma tentativa curta, ofereça uma pista e avance em passos. ${policy.guidance}`
  }

  return `COGNITIVE EFFORT GUARD: Mesmo podendo colaborar com a solução, peça primeiro que o estudante explicite hipótese, raciocínio ou tentativa. Depois ajude, deixando claro o que veio do estudante e o que foi apoio da IA.`
}

export function buildResponsibleAIPrompt(ctx: ResponsibleAIContext, userMessage: string): string {
  const policy = resolveAgePolicy(ctx)
  const effortGuard = cognitiveEffortGuard(userMessage, ctx)

  return `\nRESPONSIBLE AI CORE — POLÍTICA OBRIGATÓRIA\n- Modo pedagógico: ${policy.mode}\n- Resposta direta permitida: ${policy.directAnswerAllowed ? 'sim, após esforço do estudante' : 'não'}\n- Exigir tentativa do estudante: ${policy.requireStudentAttempt ? 'sim' : 'não'}\n- Verificação crítica: ${policy.requireVerification ? 'obrigatória quando houver fatos, fontes ou alegações verificáveis' : 'opcional'}\n- Máximo de perguntas socráticas por turno: ${policy.maxSocraticQuestions}\n- ${policy.guidance}\n- Nunca apresente inferências sobre capacidade, risco ou perfil do estudante como fatos objetivos.\n- Não tome decisões educacionais de alto impacto. Recomendações são apoio e devem admitir revisão humana.\n- Não solicite dados pessoais desnecessários.\n- Quando não tiver segurança factual, declare incerteza e proponha verificação.\n${effortGuard}`
}

export function explainRecommendation(reason: string, evidence: string[], confidence: ConfidenceLevel = 'medium'): ExplainabilityRecord {
  return {
    reason,
    confidence,
    evidence,
    humanReviewRecommended: confidence !== 'high',
  }
}
