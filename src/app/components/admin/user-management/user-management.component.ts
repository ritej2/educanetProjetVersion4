import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, UserDetails } from '../../../services/admin.service';

@Component({
    selector: 'app-user-management',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './user-management.component.html',
    styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit {
    users: any[] = [];
    filteredUsers: any[] = []; 
    searchTerm: string = '';
    selectedUser: UserDetails | null = null;
    selectedUserId: number | null = null;
    showSidePanel: boolean = false;
    loadingDetails: boolean = false;

    constructor(private adminService: AdminService) { }

    ngOnInit() {
        this.loadUsers();
    }

    loadUsers() {
        this.adminService.getUsers().subscribe({
            next: (res) => {
                if (res.success) {
                    this.users = res.data;
                    this.filteredUsers = res.data;
                }
            }
        });
    }

    onSearch() {
        if (!this.searchTerm) {
            this.filteredUsers = this.users;
            return;
        }
        const term = this.searchTerm.toLowerCase();
        this.filteredUsers = this.users.filter(u =>
            u.name.toLowerCase().includes(term) ||
            u.email.toLowerCase().includes(term)
        );
    }

    viewDetails(userId: number) {
  this.showSidePanel = true;
  this.loadingDetails = true;
  this.selectedUser = null;

  this.adminService.getUserDetails(userId).subscribe({
    next: (user) => {
      if (user) {
        this.selectedUser = user;
      } else {
        console.error('User not found');
      }
      this.loadingDetails = false;
    },
    error: (err) => {
      console.error(err);
      this.loadingDetails = false;
    }
  });
}



    closePanel() {
        this.selectedUserId = null;
        this.showSidePanel = false;
        setTimeout(() => this.selectedUser = null, 300); 
    }

    deleteUser(userId: number, event: Event) {
        event.stopPropagation(); 
        if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.')) {
            this.adminService.deleteUser(userId).subscribe({
                next: (res) => {
                    this.loadUsers(); 
                    if (this.selectedUser?.profile.id === userId) {
                        this.closePanel();
                    }
                }
            });
        }
    }
}
