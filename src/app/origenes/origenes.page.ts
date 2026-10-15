import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular';
import { ApiConfigService, ServerConfig } from '../services/api_config.service';
import { ApiDebugService } from '../services/api-debug.service';

@Component({ selector: 'app-origenes', standalone: true,
  templateUrl: './origenes.page.html', styleUrls: ['./origenes.page.scss'],
  imports: [CommonModule, FormsModule, IonContent] })
export class OrigenesPage {
  config: ServerConfig;
  message = '';
  constructor(public apiConfig: ApiConfigService, public debug: ApiDebugService, private cdr: ChangeDetectorRef) {
    this.config = this.apiConfig.getConfig();
  }
  ionViewWillEnter(): void { this.config = this.apiConfig.getConfig(); }
  save(): void {
    try { this.apiConfig.saveConfig(this.config); this.message = 'Configuración JSON guardada en este dispositivo.'; }
    catch (e: any) { this.message = e.message || 'No se pudo guardar.'; }
    this.cdr.detectChanges();
  }
  get configJson(): string { return JSON.stringify(this.config, null, 2); }
}
