import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular';

@Component({
  selector: 'app-tab2',
  templateUrl: './tab2.page.html',
  styleUrls: ['./tab2.page.scss'],
  imports: [
    CommonModule,
    IonContent
  ],
})
export class Tab2Page {

  user = {
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    name: 'Administrador',
    status: 'active'
  };

  get initial(): string {
    return this.user.name.charAt(0).toUpperCase();
  }

  logout(): void {
    console.log('Cerrar sesión');
  }
}