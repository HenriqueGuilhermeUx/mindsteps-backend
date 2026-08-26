import OpenAI from 'openai'
import { buildResponsibleAIPrompt, type AgeGroup } from './responsible-ai.js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const TUTOR_PERSONAS: Record<string, string> = {
  default: `Você é um tutor educacional curioso e investigativo que usa método socrático equilibrado. Conecte conceitos aos interesses do estudante, alterne perguntas guiadas com mini-explicações, ensine fundamentos, encoraje tentativas e evite frustração sem retirar o esforço cognitivo.`,
  scientist: `Você é um cientista entusiasmado. Trate conceitos como experimentos, peça hipóteses antes de explicar e use analogias científicas.`,
  time_traveler: `Você é um viajante do tempo. Conecte eventos históricos ao presente e use perspectivas contextualizadas sem inventar fatos.`,
  detective: `Você é um detetive lógico. Trate problemas como investigações, peça evidências e celebre quando o estudante constrói a conclusão.`,
  storyteller: `Você é um contador de histórias. Use narrativas e metáforas como apoio, mas preserve precisão conceitual e peça participação do estudante.`,
}

function getAgeGuidance(ageGroup: string): string {
  switch (ageGroup) {
    case '6-10': return `Use linguagem muito simples, exemplos concretos, frases curtas, pouco tempo de tela e atividades desplugadas quando possível.`
    case '11-14': return `Use linguagem clara, explique termos técnicos e estimule abstração progressiva com exemplos práticos.`
    case '15-17': return `Use linguagem mais sofisticada, aplicações reais, argumentação, pesquisa, autoria e análise crítica.`
    default: return ''
  }
}

interface ChatMessage { role: 'user' | 'assistant' | 'system'; content: string }

export async function generateSocraticResponse(userMessage: string, conversationHistory: ChatMessage[], tutorId: string, ageGroup: string, studentName: string, subject: string = 'geral'): Promise<string> {
  const persona = TUTOR_PERSONAS[tutorId] || TUTOR_PERSONAS.default
  const ageGuidance = getAgeGuidance(ageGroup)
  const responsibleAI = buildResponsibleAIPrompt({ ageGroup: ageGroup as AgeGroup, studentName, subject }, userMessage)

  const systemPrompt = `${persona}\n\n${ageGuidance}\n${responsibleAI}\n\nMATÉRIA ATUAL: ${subject}\nESTUDANTE: ${studentName}\n\nSeu objetivo é fazer ${studentName} pensar, compreender e construir autoria. Use perguntas socráticas e mini-explicações na medida definida pela política. Mantenha respostas concisas e adequadas à idade. Não invente fontes, dados ou fatos.`

  const messages: ChatMessage[] = [{ role: 'system', content: systemPrompt }, ...conversationHistory.slice(-10), { role: 'user', content: userMessage }]

  try {
    const response = await openai.chat.completions.create({ model: process.env.OPENAI_TUTOR_MODEL || 'gpt-4o-mini', messages: messages as any, temperature: 0.6, max_tokens: 600 })
    return response.choices[0]?.message?.content || 'Tive um problema para formular a resposta. Pode repetir sua pergunta?'
  } catch (error) {
    console.error('OpenAI error:', error)
    throw new Error('Erro ao gerar resposta. Tente novamente.')
  }
}

export function detectFrustration(messages: ChatMessage[]): boolean {
  const userMessages = messages.slice(-3).filter(m => m.role === 'user')
  const patterns = ['não sei','não entendi','não faço ideia','difícil','complicado','me ajuda','não consigo']
  const shortMessages = userMessages.filter(m => m.content.length < 15).length
  const matches = userMessages.filter(m => patterns.some(p => m.content.toLowerCase().includes(p))).length
  return shortMessages >= 2 || matches >= 2
}

export function calculateCognitiveLevel(messages: ChatMessage[]): number {
  const userMessages = messages.filter(m => m.role === 'user')
  if (userMessages.length < 3) return 5
  const recent = userMessages.slice(-5)
  const avgLength = recent.reduce((sum, m) => sum + m.content.length, 0) / recent.length
  const advancedPatterns = /portanto|consequentemente|analisando|comparando|concluindo|hipótese/i
  const advancedCount = recent.filter(m => advancedPatterns.test(m.content)).length
  return Math.max(1, Math.min(10, 5 + Math.min(3, Math.floor(avgLength / 50)) + advancedCount * 2))
}

export async function generateHint(lastQuestion: string, tutorId: string, ageGroup: string, studentName: string): Promise<string> {
  const persona = TUTOR_PERSONAS[tutorId] || TUTOR_PERSONAS.default
  const responsibleAI = buildResponsibleAIPrompt({ ageGroup: ageGroup as AgeGroup, studentName }, 'Preciso de uma dica')
  const hintPrompt = `${persona}\n${getAgeGuidance(ageGroup)}\n${responsibleAI}\nGere UMA dica curta que direcione o pensamento sem revelar a resposta. QUESTÃO: "${lastQuestion}"`
  try {
    const response = await openai.chat.completions.create({ model: process.env.OPENAI_TUTOR_MODEL || 'gpt-4o-mini', messages: [{ role: 'system', content: hintPrompt }, { role: 'user', content: 'Dê uma pista para eu continuar pensando.' }], temperature: 0.5, max_tokens: 150 })
    return response.choices[0]?.message?.content || 'Pense em um exemplo concreto e identifique qual informação da questão é mais importante.'
  } catch (error) {
    console.error('Hint generation error:', error)
    return 'Pense em um exemplo concreto e tente explicar o primeiro passo com suas palavras.'
  }
}
