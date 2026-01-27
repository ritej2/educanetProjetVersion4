/**
 * PURPOSE: Interface for talking to the AI assistant.
 * CONTENT: Displays message bubbles, handles user input, and interacts with AiChatService for streaming responses.
 */
import { Component, ElementRef, ViewChild, AfterViewChecked, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiChatService, ChatMessage } from '../../services/ai-chat.service';
import { ChatHistoryService, ChatConversation } from '../../services/chat-history.service';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './chat.component.html',
    styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, AfterViewChecked {
    @ViewChild('chatHistory') private chatContainer!: ElementRef;

    messages: ChatMessage[] = [];
    userMessage = "";
    isTyping = false;
    private shouldScroll = false;
    private isBrowser: boolean;

    conversations: ChatConversation[] = [];
    currentConversationId: number | null = null;
    isSidebarOpen = true;

    constructor(
        private aiChatService: AiChatService,
        private chatHistoryService: ChatHistoryService,
        private authService: AuthService,
        @Inject(PLATFORM_ID) platformId: any
    ) {
        this.isBrowser = isPlatformBrowser(platformId);
    }

    ngOnInit(): void {
        if (this.isBrowser) {
            this.loadConversations();
        }
    }

    ngAfterViewChecked(): void {
        if (this.isBrowser && this.shouldScroll) {
            this.scrollToBottom();
            this.shouldScroll = false;
        }
    }

    loadConversations(): void {
        this.chatHistoryService.loadConversations().subscribe({
            next: (res) => {
                if (res.success) {
                    this.conversations = res.data;
                    // Automatically load the latest conversation if available
                    if (this.conversations.length > 0) {
                        this.selectConversation(this.conversations[0].id);
                    } else {
                        this.startNewChat();
                    }
                }
            }
        });
    }

    selectConversation(id: number): void {
        this.currentConversationId = id;
        this.isTyping = true;
        this.messages = [];

        this.chatHistoryService.getMessages(id).subscribe({
            next: (res) => {
                if (res.success) {
                    this.messages = res.data.map((m: any) => ({
                        text: m.content,
                        sender: m.role === 'user' ? 'user' : 'ai',
                        timestamp: new Date(m.timestamp)
                    }));
                    // Sync with AI service
                    this.aiChatService.setHistory(res.data.map((m: any) => ({
                        role: m.role === 'ai' ? 'assistant' : m.role,
                        content: m.content
                    })));
                }
                this.isTyping = false;
                this.shouldScroll = true;
            },
            error: () => {
                this.isTyping = false;
            }
        });
    }

    startNewChat(): void {
        this.currentConversationId = null;
        this.messages = [
            {
                text: "Bonjour ! Je suis votre assistant parental virtuel spécialisé en éducation et nutrition. Comment puis-je vous aider aujourd'hui ?",
                sender: 'ai',
                timestamp: new Date()
            }
        ];
        this.aiChatService.clearHistory();
    }

    scrollToBottom(): void {
        if (!this.isBrowser) return;
        try {
            if (this.chatContainer) {
                this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
            }
        } catch (err) { }
    }

    sendMessage(): void {
        if (!this.userMessage || this.userMessage.trim() === '') {
            return;
        }

        const messageText = this.userMessage;

        // If no conversation active, create one first
        if (this.currentConversationId === null) {
            // Use first 30 chars of message as title
            const title = messageText.length > 30 ? messageText.substring(0, 30) + '...' : messageText;
            this.chatHistoryService.createConversation(title).subscribe({
                next: (res) => {
                    if (res.success) {
                        this.currentConversationId = res.data.id;
                        this.conversations = [res.data, ...this.conversations];
                        this.processMessage(messageText);
                    }
                }
            });
        } else {
            this.processMessage(messageText);
        }
    }

    private processMessage(messageText: string): void {
        // Add user message to UI
        const userMsg: ChatMessage = {
            text: messageText,
            sender: 'user',
            timestamp: new Date()
        };
        this.messages.push(userMsg);

        // Save user message to DB
        if (this.currentConversationId) {
            this.chatHistoryService.saveMessage(this.currentConversationId, 'user', messageText).subscribe();
        }

        this.userMessage = "";
        this.isTyping = true;
        this.shouldScroll = true;

        // Create a placeholder for AI response
        const aiMessageIndex = this.messages.length;
        this.messages.push({
            text: '',
            sender: 'ai',
            timestamp: new Date()
        });

        // Call streaming service
        let fullResponse = '';
        let firstChunkReceived = false;

        this.aiChatService.sendMessageStream(messageText).subscribe({
            next: (chunk) => {
                if (!firstChunkReceived) {
                    firstChunkReceived = true;
                    this.isTyping = false; // Hide indicator when first chunk arrives
                }
                fullResponse += chunk;
                this.messages[aiMessageIndex].text = fullResponse;
                this.shouldScroll = true;
            },
            error: (err) => {
                console.error("Erreur chat:", err);
                this.messages[aiMessageIndex].text = "Désolé, une erreur s'est produite. Veuillez réessayer.";
                this.isTyping = false;
            },
            complete: () => {
                this.isTyping = false;
                // Save AI response to DB
                if (this.currentConversationId) {
                    this.chatHistoryService.saveMessage(this.currentConversationId, 'ai', fullResponse).subscribe();
                }
            }
        });
    }

    deleteConversation(event: Event, id: number): void {
        event.stopPropagation();
        if (this.isBrowser && confirm('Supprimer cette conversation ?')) {
            this.chatHistoryService.deleteConversation(id).subscribe({
                next: () => {
                    this.conversations = this.conversations.filter(c => c.id !== id);
                    if (this.currentConversationId === id) {
                        this.startNewChat();
                    }
                }
            });
        }
    }

    toggleSidebar(): void {
        this.isSidebarOpen = !this.isSidebarOpen;
    }

    clearChat(): void {
        this.startNewChat();
    }
}


