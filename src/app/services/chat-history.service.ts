import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, map, tap } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface ChatConversation {
    id: number;
    user_id: number;
    title: string;
    started_at: string;
    updated_at: string;
}

export interface StoredMessage {
    id?: number;
    conversation_id: number;
    role: 'user' | 'ai' | 'system';
    content: string;
    timestamp?: string;
}

@Injectable({
    providedIn: 'root'
})
export class ChatHistoryService {
    private conversationsSubject = new BehaviorSubject<ChatConversation[]>([]);
    public conversations$ = this.conversationsSubject.asObservable();

    private apiBase = environment.PHP_API_URL + '/chat';

    constructor(
        private http: HttpClient,
        private authService: AuthService
    ) {
        this.authService.currentUser$.subscribe(user => {
            if (user) {
                this.loadConversations().subscribe();
            } else {
                this.conversationsSubject.next([]);
            }
        });
    }

    loadConversations(): Observable<any> {
        return this.http.get<{ success: boolean, data: ChatConversation[] }>(`${this.apiBase}/conversations.php`).pipe(
            tap(res => {
                if (res.success) {
                    this.conversationsSubject.next(res.data);
                }
            })
        );
    }

    createConversation(title: string = 'Nouvelle conversation'): Observable<any> {
        return this.http.post<{ success: boolean, data: ChatConversation }>(`${this.apiBase}/conversations.php`, { title }).pipe(
            tap(res => {
                if (res.success) {
                    const current = this.conversationsSubject.value;
                    this.conversationsSubject.next([res.data, ...current]);
                }
            })
        );
    }

    getMessages(conversationId: number): Observable<any> {
        return this.http.get<{ success: boolean, data: StoredMessage[] }>(`${this.apiBase}/messages.php?conversation_id=${conversationId}`);
    }

    saveMessage(conversationId: number, role: 'user' | 'ai' | 'system', content: string): Observable<any> {
        return this.http.post<{ success: boolean, data: StoredMessage }>(`${this.apiBase}/messages.php`, {
            conversation_id: conversationId,
            role,
            content
        });
    }

    deleteConversation(id: number): Observable<any> {
        return this.http.delete<any>(`${this.apiBase}/conversations.php?id=${id}`).pipe(
            tap(res => {
                if (res.success) {
                    const current = this.conversationsSubject.value;
                    this.conversationsSubject.next(current.filter(c => c.id !== id));
                }
            })
        );
    }

    clearState(): void {
        this.conversationsSubject.next([]);
    }
}
