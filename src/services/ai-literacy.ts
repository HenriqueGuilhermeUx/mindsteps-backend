import type { AgeGroup } from './responsible-ai.js'

export const AI_LITERACY_COMPETENCIES = [
  { key: 'patterns_rules_algorithms', domain: 'computational', title: 'Padrões, regras e algoritmos' },
  { key: 'data_representation', domain: 'computational', title: 'Dados e representação' },
  { key: 'models_learning_limits', domain: 'computational', title: 'Como modelos aprendem e seus limites' },
  { key: 'human_ai_interaction', domain: 'computational', title: 'Interação humano–IA' },
  { key: 'information_verification', domain: 'media', title: 'Busca, fontes e verificação' },
  { key: 'synthetic_media', domain: 'media', title: 'Conteúdo sintético e manipulação' },
  { key: 'recommendation_systems', domain: 'media', title: 'Recomendação, bolhas e influência' },
  { key: 'privacy_security', domain: 'media', title: 'Privacidade, dados pessoais e segurança' },
  { key: 'bias_fairness', domain: 'society', title: 'Viés, equidade e não discriminação' },
  { key: 'authorship_integrity', domain: 'society', title: 'Autoria, integridade e uso responsável' },
  { key: 'social_work_democracy', domain: 'society', title: 'Impactos sociais, trabalho e democracia' },
  { key: 'environment_sustainability', domain: 'society', title: 'Impactos ambientais e sustentabilidade' },
] as const

export function literacyStage(ageGroup: AgeGroup) {
  if (ageGroup === '6-10') return { stage: 'descobrir', method: 'lúdico, concreto e preferencialmente desplugado', directGenerativeUse: false }
  if (ageGroup === '11-14') return { stage: 'investigar', method: 'experimentos guiados, comparação, verificação e projetos curtos', directGenerativeUse: true }
  return { stage: 'criar_e_auditar', method: 'pesquisa, criação, auditoria, argumentação e projetos interdisciplinares', directGenerativeUse: true }
}

export function getAILiteracyCurriculum(ageGroup: AgeGroup) {
  const stage = literacyStage(ageGroup)
  return {
    ...stage,
    competencies: AI_LITERACY_COMPETENCIES.map((c, index) => ({
      ...c,
      order: index + 1,
      objective: ageGroup === '6-10'
        ? `Reconhecer ${c.title.toLowerCase()} por brincadeiras, exemplos cotidianos e atividades concretas.`
        : ageGroup === '11-14'
          ? `Investigar ${c.title.toLowerCase()}, comparar resultados e explicar riscos e limites.`
          : `Aplicar, analisar criticamente e auditar ${c.title.toLowerCase()} em situações reais e projetos.`
    }))
  }
}
