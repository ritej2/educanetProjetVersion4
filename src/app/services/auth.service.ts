/**
 * PURPOSE: Manages user session and authentication.
 * CONTENT: Functions for login(), signup(), logout(), and token storage in localStorage.
 */
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
    id: number;
    name: string;
    email: string;
    role?: 'user' | 'admin';
    created_at: string;
}

export interface AuthResponse {
    success: boolean;
    message: string;
    data: {
        token: string;
        user: User;
    };
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = environment.PHP_API_URL;
    private currentUserSubject = new BehaviorSubject<User | null>(null);
    public currentUser$ = this.currentUserSubject.asObservable();
    private isBrowser: boolean;

    constructor(
        private http: HttpClient,
        @Inject(PLATFORM_ID) platformId: any
    ) {
        this.isBrowser = isPlatformBrowser(platformId);
        // Check if user is already logged in
        if (this.isBrowser) {
            this.loadUserFromStorage();
            this.checkAuth();
        }
    }

    private loadUserFromStorage(): void {
        const storedUser = localStorage.getItem('current_user');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                this.currentUserSubject.next(user);
            } catch (e) {
                console.error('Error parsing stored user', e);
            }
        }
    }

    /**
     * Check if user is authenticated on app init
     */
    private checkAuth(): void {
        const token = this.getToken();
        if (token) {
            this.verifyToken().subscribe({
                next: (response) => {
                    if (response.success) {
                        this.currentUserSubject.next(response.data.user);
                        // Update storage with fresh data
                        if (this.isBrowser) {
                            localStorage.setItem('current_user', JSON.stringify(response.data.user));
                        }
                    } else {
                        // this.logout(); // Disabled during debug
                    }
                },
                error: () => {
                    // this.logout(); // Disabled during debug
                }
            });
        }
    }

    /**
     * Signup new user
     */
    signup(name: string, email: string, password: string, phone: string = ''): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.apiUrl}/auth/signup.php`, {
            name,
            email,
            password,
            phone
        }).pipe(
            tap(response => {
                if (response.success) {
                    this.setToken(response.data.token);
                    this.currentUserSubject.next(response.data.user);
                    if (this.isBrowser) {
                        localStorage.setItem('current_user', JSON.stringify(response.data.user));
                    }
                }
            })
        );
    }

    /**
     * Login user
     */
    login(email: string, password: string): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login.php`, {
            email,
            password
        }).pipe(
            tap(response => {
                if (response.success) {
                    this.setToken(response.data.token);
                    this.currentUserSubject.next(response.data.user);
                    if (this.isBrowser) {
                        localStorage.setItem('current_user', JSON.stringify(response.data.user));
                    }
                }
            })
        );
    }

    /**
     * Verify JWT token
     */
    verifyToken(): Observable<any> {
        return this.http.post(`${this.apiUrl}/auth/verify.php`, {});
    }

    /**
     * Logout user
     */
    logout(): void {
        if (this.isBrowser) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('current_user');
        }
        this.currentUserSubject.next(null);
    }

    /**
     * Get stored token
     */
    getToken(): string | null {
        if (this.isBrowser) {
            return localStorage.getItem('auth_token');
        }
        return null;
    }

    /**
     * Store token
     */
    private setToken(token: string): void {
        if (this.isBrowser) {
            localStorage.setItem('auth_token', token);
        }
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        return !!this.getToken();
    }


    /**
     * Get current user value
     */
    getCurrentUser(): User | null {
        return this.currentUserSubject.value;
    }

    /**
     * Check if current user is admin
     */
    isAdmin(): boolean {
        const user = this.getCurrentUser();
        return user?.role === 'admin';
    }
}
