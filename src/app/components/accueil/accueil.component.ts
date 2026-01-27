/**
 * PURPOSE: The main dashboard showing a summary of children and upcoming events.
 * CONTENT: Visual overview of the parent's space with links to key features.
 */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ChildService } from '../../services/child.service';
import { EventService, CalendarEvent } from '../../services/event.service';
import { forkJoin } from 'rxjs';

@Component({
    selector: 'app-accueil',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './accueil.component.html',
    styleUrls: ['./accueil.component.css']
})
export class AccueilComponent implements OnInit {
    loading = true;
    childrenCount = 0;
    nextEvent: CalendarEvent | null = null;

    constructor(
        private childService: ChildService,
        private eventService: EventService
    ) { }

    ngOnInit(): void {
        forkJoin({
            children: this.childService.getChildren(),
            events: this.eventService.getEvents()
        }).subscribe({
            next: (data) => {
                this.childrenCount = data.children.length;

                // Logic to find next event
                const now = new Date();
                const upcoming = data.events.filter(e => new Date(e.date) >= now);
                upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                this.nextEvent = upcoming.length > 0 ? upcoming[0] : null;

                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading dashboard data', err);
                this.loading = false;
            }
        });
    }
}
