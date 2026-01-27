/**
 * PURPOSE: Controls the AI Assistant (Chatbot).
 * CONTENT: Sends messages to Ollama, manages system prompts (educational/nutrition focus), and handles streaming responses.
 */
import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { ContextService, ChildProfile } from './context.service';
import { HomeworkService, Homework } from './homework.service';

export interface ChatMessage {
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
}

@Injectable({
    providedIn: 'root'
})
export class AiChatService {

    private apiUrl = environment.OLLAMA_API_URL;
    private homeworkContext: any = null;

    // System prompt to constrain the AI to educational and nutrition topics
    // System prompt pour l'IA adaptée aux parents tunisiens
    private readonly SYSTEM_PROMPT = `Tu es un assistant parental virtuel spécialisé en ÉDUCATION et NUTRITION, destiné aux parents en Tunisie.
Ton objectif est d'aider les parents avec des conseils pratiques, bienveillants et personnalisés, en tenant compte du contexte tunisien.

DOMAINES AUTORISÉS :
1. ÉDUCATION :
   - Suivi scolaire via la plateforme **Rafi9ni** : notes, exercices, documents pédagogiques, devoirs et activités éducatives.
   - Suivi de l'apprentissage et du comportement de l'enfant via **9isati**.
2. NUTRITION :
   - Recettes et conseils adaptés aux enfants en Tunisie.
   - **RÉFÉRENCE PRODUITS** : Utilise les produits de la marque **Délice** (lait, yaourts, produits laitiers, jus) comme référence principale pour tes conseils nutritionnels et tes idées de goûters ou repas.

RÈGLES CRITIQUES :
1. ANALYSE INITIALE : Si des données d'analyse (JSON) sont disponibles, commence par résumer les points forts et faibles.
2. DOCUMENTS : Tu ne peux proposer QUE les documents listés dans "RESSOURCES PÉDAGOGIQUES RÉELLES". 
3. INTERDICTION : Ne jamais inventer de titres de documents. Si la liste est vide ou si aucun document ne correspond à la matière demandée, dis explicitement que tu n'en as pas pour le moment.
4. ÉVEIL SCIENTIFIQUE : Note que ce domaine couvre la science, la physique, la chimie et la biologie.
5. LANGUE : Tu peux comprendre et répondre en **français** ou en **arabe** (arabe littéraire ou derja tunisienne), selon la préférence du parent. Garde toujours un ton clair et bienveillant.`;

    private conversationHistory: Array<{ role: string; content: string }> = [
        { role: 'system', content: this.SYSTEM_PROMPT }
    ];

    constructor(
        private http: HttpClient,
        private authService: AuthService,
        private contextService: ContextService,
        private homeworkService: HomeworkService,
        private ngZone: NgZone
    ) {
        this.authService.currentUser$.subscribe(user => {
            if (user) {
                console.log('AiChatService: Utilisateur connecté, chargement du profil...', user.id);
                this.contextService.loadProfileForUser(user.id);
                this.homeworkService.loadLibrary(user.id);
                this.updateSystemPromptWithProfile();
            } else {
                this.homeworkService.clearLibrary();
                this.clearHistory();
            }
        });

        // 1. React to Profile Changes -> Trigger Search for each child if needed
        this.contextService.childProfile$.subscribe(profiles => {
            console.log('AiChatService: Changement de profils détecté:', profiles?.length || 0);

            // On déclenche la recherche pour le dernier profil mis à jour (le dernier de la liste)
            if (profiles && profiles.length > 0) {
                const latestProfile = this.contextService.getProfile();
                if (latestProfile) {
                    this.homeworkService.performSearch(latestProfile);
                }
            }

            this.updateSystemPromptWithProfile();
        });

        // 2. React to Documents Found -> Update Prompt
        this.homeworkService.recommendedDocuments$.subscribe((docs: Homework[]) => {
            console.log('AiChatService: Documents mis à jour:', docs.length);
            this.homeworkContext = docs;
            this.updateSystemPromptWithProfile();
        });
    }

    setHomeworkContext(homeworkData: any): void {
        // Legacy support if needed, but now we use subscription
        this.homeworkContext = homeworkData;
        this.updateSystemPromptWithProfile();
    }

    private getSystemPromptWithProfile(): string {
        let fullPrompt = this.SYSTEM_PROMPT;
        const allProfiles = this.contextService.getAllProfiles();

        if (allProfiles && allProfiles.length > 0) {
            fullPrompt += `
            
            ${this.contextService.getAnalysisJSON()}

RÉSUMÉ DES ENFANTS ACTUELS :`;

            allProfiles.forEach((p, index) => {
                const child = this.contextService.formatChildSummary(p);
                fullPrompt += `
Enfant ${index + 1} : ${child.q_nom || 'Sans nom'}
- Niveau : ${child.niveauScolaire}
- Matières à renforcer : ${child.matieresEnDifficulte.join(', ')}
- Observations : ${child.pointsAAmeliorer}`;
            });
        }

        if (this.homeworkContext && Array.isArray(this.homeworkContext) && this.homeworkContext.length > 0) {
            const docs = this.homeworkContext.map((d: any) => ({
                titre: d.title,
                matiere: d.subject,
                fichiers: d.files.map((f: any) => f.nom)
            }));

            fullPrompt += `

📚 RESSOURCES PÉDAGOGIQUES RÉELLES (Actuellement dans la Bibliothèque du parent) :
${JSON.stringify(docs, null, 2)}

INSTRUCTION CRITIQUE : 
1. Si cette liste contient des documents pertinents pour la matière demandée, recommande-les en citant le TITRE EXACT.
2. Explique que ces documents sont déjà prêts dans l'onglet "Bibliothèque".
3. SI LA LISTE CI-DESSUS EST VIDE OU NE CONTIENT PAS LA MATIÈRE DEMANDÉE : Explique que tu n'as pas encore de documents spécifiques pour cette matière dans sa bibliothèque personnelle, et propose des conseils généraux en attendant.
4. NE JAMAIS INVENTER DE DOCUMENT.`;
        } else {
            fullPrompt += `\n\nNOTE : Aucune ressource spécifique n'est encore chargée dans la bibliothèque. Propose des conseils généraux et invite le parent à vérifier le questionnaire.`;
        }

        fullPrompt += `\n\nRéponds de manière concise et guide toujours le parent vers les outils de la plateforme Rafi9ni.`;

        return fullPrompt;
    }

    private updateSystemPromptWithProfile(): void {
        const fullPrompt = this.getSystemPromptWithProfile();
        console.log('AiChatService: Système Prompt mis à jour avec le contexte:', fullPrompt);

        // Ensure the system prompt is always at the beginning of the history
        if (this.conversationHistory.length > 0 && this.conversationHistory[0].role === 'system') {
            this.conversationHistory[0].content = fullPrompt;
        } else {
            this.conversationHistory.unshift({ role: 'system', content: fullPrompt });
        }
    }

    sendMessageStream(userMessage: string): Observable<string> {
        // The system prompt is already managed by updateSystemPromptWithProfile() 
        // which is called when the profile or homework context changes.
        // We just need to ensure it's there.
        this.updateSystemPromptWithProfile();

        // Add user message to conversation history
        this.conversationHistory.push({
            role: 'user',
            content: userMessage
        });

        return new Observable(observer => {
            const body = {
                model: 'llama3.2',
                messages: this.conversationHistory,
                stream: true,
                options: {
                    temperature: 0.7,
                    num_ctx: 4096
                }
            };

            console.log('AiChatService: Envoi requête à Ollama (llama3.2)...');
            console.dir(body.messages);

            fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body)
            })
                .then(async response => {
                    console.log('AiChatService: Réponse reçue de Ollama, status:', response.status);
                    if (!response.ok) {
                        const text = await response.text();
                        throw new Error(`Ollama error (${response.status}): ${text}`);
                    }

                    const reader = response.body?.getReader();
                    const decoder = new TextDecoder();
                    let fullResponse = '';
                    let buffer = '';

                    const readChunk = (): void => {
                        reader?.read().then(({ done, value }) => {
                            if (done) {
                                // Process any remaining content in buffer
                                if (buffer.trim()) {
                                    this.processJsonLines(buffer, (content) => {
                                        fullResponse += content;
                                        this.ngZone.run(() => observer.next(content));
                                    });
                                }

                                // Add AI response to conversation history
                                this.conversationHistory.push({
                                    role: 'assistant',
                                    content: fullResponse
                                });
                                console.log('AiChatService: Flux terminé. Appel à observer.complete()');
                                this.ngZone.run(() => observer.complete());
                                return;
                            }

                            const chunk = decoder.decode(value, { stream: true });
                            buffer += chunk;

                            const lastNewlineIndex = buffer.lastIndexOf('\n');
                            if (lastNewlineIndex !== -1) {
                                const linesToProcess = buffer.substring(0, lastNewlineIndex);
                                buffer = buffer.substring(lastNewlineIndex + 1);

                                this.processJsonLines(linesToProcess, (content) => {
                                    fullResponse += content;
                                    this.ngZone.run(() => observer.next(content));
                                });
                            }

                            readChunk();
                        }).catch(error => {
                            this.ngZone.run(() => observer.error(error));
                        });
                    };

                    readChunk();
                })
                .catch(error => {
                    this.ngZone.run(() => observer.error(error));
                });
        });
    }

    private processJsonLines(text: string, onContent: (content: string) => void): void {
        const lines = text.split('\n').filter(line => line.trim() !== '');
        for (const line of lines) {
            try {
                const json = JSON.parse(line);
                let content = '';

                // standard chat content
                if (json.message?.content) {
                    content += json.message.content;
                }

                // reasoning/thought content if model supports it
                if (json.message?.thought) {
                    content += `[Pensée : ${json.message.thought}] `;
                }

                if (content) {
                    onContent(content);
                }
            } catch (e) {
                // Skip invalid JSON lines (might be partial)
            }
        }
    }

    clearHistory(): void {
        this.conversationHistory = [
            { role: 'system', content: this.getSystemPromptWithProfile() }
        ];
    }

    setHistory(messages: Array<{ role: string; content: string }>): void {
        this.conversationHistory = [
            { role: 'system', content: this.getSystemPromptWithProfile() },
            ...messages
        ];
    }
}
