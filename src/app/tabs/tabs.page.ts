/** Conserva las pestañas y muestra Usuarios solo al administrador. */
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { triangle, images, square, serverOutline, personCircle, statsChartOutline } from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [CommonModule, IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class TabsPage {
  get isAdmin(): boolean {
    try { return JSON.parse(localStorage.getItem('user') || 'null')?.role === 'admin'; }
    catch { return false; }
  }

  constructor() {
    addIcons({ triangle, images, square, serverOutline, personCircle, statsChartOutline });
  }
}
