import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ContextService } from '../../services/context.service';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-questionnaire',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './questionnaire.component.html',
    styleUrls: ['./questionnaire.component.css']
})
export class QuestionnaireComponent {
    currentLang: 'fr' | 'ar' = 'fr';

    formData: any = {
        q_nom: '', // NEW: Nom de l'enfant
        q_age: null,
        q_niveau: '',
        q_moyenne: null,
        q_math: null,
        q_science: null,
        q_anglais: null,
        q_obs: '',
        q_comportement: ''
    };

    constructor(
        private contextService: ContextService,
        private router: Router,
        private authService: AuthService
    ) {
        // We do initialization in ngOnInit normally, but constructor is also fine if services are ready.
    }

    ngOnInit(): void {
        const user = this.authService.getCurrentUser();
        if (user) {
            // Load persistent data specific to this user
            this.contextService.loadProfileForUser(user.id);

            // Subscribe to see if we have data now
            const existing = this.contextService.getChildProfile();
            if (existing) {
                this.formData = { ...this.formData, ...existing };
            } else {
                // Reset form if no data found for this user
                this.resetForm();
            }
        } else {
            // Should not happen due to AuthGuard, but safety first
            this.resetForm();
        }
    }

    resetForm(): void {
        this.formData = {
            q_nom: '',
            q_age: null,
            q_niveau: '',
            q_moyenne: null,
            q_math: null,
            q_science: null,
            q_anglais: null,
            q_obs: '',
            q_comportement: ''
        };
    }

    toggleLanguage(): void {
        this.currentLang = this.currentLang === 'fr' ? 'ar' : 'fr';
    }

    onSubmit(): void {
        const user = this.authService.getCurrentUser();
        if (user) {
            console.log('Questionnaire soumis avec les données:', this.formData);
            this.contextService.updateChildProfile(this.formData, user.id);
            alert('Questionnaire enregistré avec succès !');
            this.router.navigate(['/chat']);
        } else {
            alert('Erreur: Utilisateur non connecté');
        }
    }
}
