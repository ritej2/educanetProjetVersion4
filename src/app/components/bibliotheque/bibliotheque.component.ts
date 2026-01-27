import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeworkService, Homework, HomeworkFile } from '../../services/homework.service';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-bibliotheque',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bibliotheque-container">
      <div class="header-section">
        <h1 class="main-title">Ma Bibliothèque Éducative</h1>
        <p class="subtitle">Retrouvez tous les documents recommandés pour le parcours de votre enfant.</p>
      </div>

      <div *ngIf="(documents$ | async) as docs" class="content-area">
        <!-- Empty State -->
        <div class="empty-state" *ngIf="docs.length === 0">
          <div class="icon-circle">
            <i class="fa fa-book-bookmark"></i>
          </div>
          <h2>Votre bibliothèque est vide</h2>
          <p>Dès que vous aurez rempli le questionnaire, nous sélectionnerons les meilleures ressources pour votre enfant.</p>
          <button class="btn-action" (click)="goToQuestionnaire()">Saisir le questionnaire</button>
        </div>

        <!-- Grouped Documents -->
        <div class="child-sections" *ngIf="docs.length > 0">
          <div class="child-section" *ngFor="let group of getGroupedDocuments(docs)">
            <div class="child-header">
              <div class="child-avatar">
                <i class="fa fa-child"></i>
              </div>
              <div class="child-info">
                <h2 class="child-name">{{ group.name }}</h2>
                <div class="child-meta">
                  <span class="meta-item"><i class="fa fa-graduation-cap"></i> {{ group.level }}</span>
                  <span class="meta-item"><i class="fa fa-book-open"></i> {{ group.subjects.join(', ') }}</span>
                </div>
              </div>
            </div>

            <div class="documents-grid">
              <div class="doc-card" *ngFor="let doc of group.documents">
                <button class="delete-icon" (click)="deleteDocument(doc.id, doc.childName)" title="Supprimer">
                  <i class="fa fa-times"></i>
                </button>
                <div class="card-content">
                  <div class="card-header">
                    <span class="subject-badge">{{ doc.subject || 'Général' }}</span>
                    <span class="date-badge" *ngIf="doc.addedAt">
                      <i class="fa fa-calendar-alt"></i> {{ doc.addedAt | date:'dd/MM/yyyy' }}
                    </span>
                  </div>
                  
                  <h3 class="doc-title">{{ doc.title }}</h3>
                  
                  <div class="files-container">
                    <div class="file-row" *ngFor="let file of doc.files">
                      <div class="file-info" (click)="download(file)" style="cursor: pointer;">
                        <div class="file-icon">
                          <i class="fa fa-file-pdf"></i>
                        </div>
                        <span class="file-name">{{ file.nom }}</span>
                      </div>
                      <button class="download-trigger" (click)="download(file)">
                        <i class="fa fa-cloud-download-alt"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="section-divider"></div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap');

    :host {
      display: block;
      font-family: 'Outfit', sans-serif;
      --primary: #6366f1;
      --primary-gradient: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
      --bg-color: #f8fafc;
      --card-bg: rgba(255, 255, 255, 0.8);
    }

    .bibliotheque-container {
      padding: 40px 24px;
      min-height: 100vh;
      background: var(--bg-color);
      background-image: 
        radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.1) 0, transparent 50%), 
        radial-gradient(at 100% 0%, rgba(168, 85, 247, 0.1) 0, transparent 50%);
    }

    .header-section {
      text-align: center;
      margin-bottom: 50px;
    }

    .main-title {
      font-size: 2.8rem;
      font-weight: 700;
      background: var(--primary-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 12px;
    }

    .subtitle {
      color: #64748b;
      font-size: 1.1rem;
    }

    /* Sections Style */
    .child-section {
      margin-bottom: 60px;
    }

    .child-header {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 30px;
      padding: 0 10px;
    }

    .child-avatar {
      width: 60px;
      height: 60px;
      background: var(--primary-gradient);
      border-radius: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      box-shadow: 0 10px 15px rgba(99, 102, 241, 0.2);
    }

    .child-name {
      font-size: 1.8rem;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 8px;
    }

    .child-meta {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }

    .meta-item {
      color: #64748b;
      font-size: 0.95rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .meta-item i {
      color: var(--primary);
    }

    .section-divider {
      margin-top: 50px;
      border-bottom: 2px dashed #e2e8f0;
      max-width: 200px;
      margin-left: auto;
      margin-right: auto;
    }

    /* Grid Layout */
    .documents-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 30px;
      margin: 0 auto;
    }

    /* Card Design */
    .doc-card {
      position: relative;
      border-radius: 24px;
      overflow: hidden;
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      border: 1px solid rgba(255,255,255,0.4);
      background: var(--card-bg);
      backdrop-filter: blur(10px);
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);
    }

    .doc-card:hover {
      transform: translateY(-10px);
      box-shadow: 0 20px 40px -10px rgba(99, 102, 241, 0.2);
    }

    .delete-icon {
      position: absolute;
      top: 15px;
      right: 15px;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 10;
      transition: all 0.2s;
      opacity: 0;
    }

    .doc-card:hover .delete-icon {
      opacity: 1;
    }

    .delete-icon:hover {
      background: #ef4444;
      color: white;
      transform: scale(1.1);
    }

    .card-content {
      position: relative;
      z-index: 2;
      padding: 24px;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .subject-badge {
      padding: 6px 14px;
      background: rgba(99, 102, 241, 0.1);
      color: var(--primary);
      border-radius: 12px;
      font-size: 0.85rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .date-badge {
      color: #94a3b8;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .doc-title {
      font-size: 1.4rem;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 12px;
      line-height: 1.3;
    }

    .doc-desc {
      color: #64748b;
      font-size: 0.95rem;
      line-height: 1.6;
      margin-bottom: 24px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* Files Section */
    .files-container {
      border-top: 1px solid rgba(0,0,0,0.05);
      padding-top: 20px;
    }

    .file-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: rgba(255,255,255,0.5);
      border-radius: 16px;
      margin-bottom: 10px;
      transition: background 0.2s;
    }

    .file-row:hover {
      background: white;
    }

    .file-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .file-icon {
      width: 36px;
      height: 36px;
      background: #fee2e2;
      color: #ef4444;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .file-name {
      font-weight: 500;
      color: #475569;
      font-size: 0.9rem;
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .download-trigger {
      width: 36px;
      height: 36px;
      border: none;
      background: #f1f5f9;
      color: #64748b;
      border-radius: 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .download-trigger:hover {
      background: var(--primary);
      color: white;
      transform: scale(1.1);
    }

    /* Empty State */
    .empty-state {
      max-width: 500px;
      margin: 100px auto;
      text-align: center;
      padding: 60px 40px;
      background: white;
      border-radius: 32px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.05);
    }

    .empty-state .icon-circle {
      width: 100px;
      height: 100px;
      background: var(--primary-gradient);
      color: white;
      font-size: 40px;
      margin: 0 auto 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 20px rgba(99, 102, 241, 0.3);
    }

    .btn-action {
      margin-top: 30px;
      padding: 14px 28px;
      background: var(--primary-gradient);
      color: white;
      border: none;
      border-radius: 16px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 10px 15px rgba(99, 102, 241, 0.2);
      transition: all 0.2s;
    }

    .btn-action:hover {
      transform: scale(1.05);
      box-shadow: 0 15px 25px rgba(99, 102, 241, 0.3);
    }
  `]
})
export class BibliothequeComponent implements OnInit {
  documents$: Observable<Homework[]>;

  constructor(private homeworkService: HomeworkService, private router: Router) {
    this.documents$ = this.homeworkService.recommendedDocuments$;
  }

  ngOnInit(): void { }

  goToQuestionnaire(): void {
    this.router.navigate(['/questionnaire']);
  }

  deleteDocument(id: number, childName?: string): void {
    if (confirm('Voulez-vous vraiment supprimer ce document ?')) {
      this.homeworkService.removeDocument(id, childName || 'Enfant');
    }
  }

  // bibliotheque.component.ts
  download(file: HomeworkFile): void {
    this.homeworkService.downloadFile(file).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  getGroupedDocuments(docs: Homework[]): { name: string, level: string, subjects: string[], documents: Homework[] }[] {
    const groups: { [key: string]: { level: string, subjects: Set<string>, documents: Homework[] } } = {};

    docs.forEach(doc => {
      const name = doc.childName || 'Enfant';
      if (!groups[name]) {
        groups[name] = {
          level: doc.childLevel || 'Niveau inconnu',
          subjects: new Set<string>(),
          documents: []
        };
      }
      groups[name].documents.push(doc);

      // NEW: Ajouter toutes les matières ciblées dans l'entête
      if (doc.targetSubjects) {
        doc.targetSubjects.forEach(s => groups[name].subjects.add(s));
      }
      if (doc.subject) groups[name].subjects.add(doc.subject);
    });

    return Object.keys(groups).map(name => ({
      name,
      level: groups[name].level,
      // Capitalisation pour un meilleur style
      subjects: Array.from(groups[name].subjects).map(s =>
        s.charAt(0).toUpperCase() + s.slice(1)
      ),
      documents: groups[name].documents
    }));
  }
}
