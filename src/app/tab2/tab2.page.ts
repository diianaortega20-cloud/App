/** Muestra el perfil de la sesión actual y permite cerrarla en el servidor. */
import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { AuthService, SessionUser } from '../services/auth.service';

@Component({
  selector: 'app-tab2', standalone: true,
  templateUrl: './tab2.page.html', styleUrls: ['./tab2.page.scss'],
  imports: [CommonModule, FormsModule, IonContent]
})
export class Tab2Page implements OnDestroy {
  user: SessionUser | null = null;
  editName = '';
  editEmail = '';
  saving = false;
  message = '';
  loading = false;
  closing = false;
  errorMessage = '';
  private destroyed = false;
  private version = 0;

  constructor(
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  get initial(): string { return this.user?.name.charAt(0).toUpperCase() || '?'; }

  ionViewWillEnter(): void { void this.loadProfile(); }
  ionViewWillLeave(): void {
    this.version++;
    this.loading = false;
    this.user = null;
  }

  private refresh(): void {
    if (!this.destroyed) this.cdr.detectChanges();
  }

  // Consulta cada vez que se abre el perfil para evitar datos de otra cuenta.
  async loadProfile(): Promise<void> {
    if (this.loading || this.closing) return;
    const version = ++this.version;
    this.user = null;
    this.loading = true;
    this.errorMessage = '';
    this.refresh();
    try {
      const user = await this.auth.getProfile();
      if (!this.destroyed && version === this.version) { this.user = user; this.editName = user.name; this.editEmail = user.email; }
    } catch (error: any) {
      if (this.destroyed || version !== this.version) return;
      if ((error?.response?.status ?? error?.status) === 401) {
        this.auth.clearLocalSession();
        await this.router.navigateByUrl('/login', { replaceUrl: true });
      } else {
        this.errorMessage = error?.response?.data?.message || error?.message ||
          'No fue posible consultar el perfil. Revisa la conexión con el servidor.';
      }
    } finally {
      if (!this.destroyed && version === this.version) {
        this.loading = false;
        this.refresh();
      }
    }
  }

  async saveProfile(): Promise<void> {
    if (this.saving || this.loading || this.closing || !this.user) return;
    this.saving = true; this.errorMessage = ''; this.message = ''; this.refresh();
    try {
      this.user = await this.auth.updateProfile(this.editName, this.editEmail);
      this.message = 'Perfil actualizado.';
    } catch (error: any) {
      if (error?.response?.status === 401) {
        this.auth.clearLocalSession();
        await this.router.navigateByUrl('/login', { replaceUrl: true });
      } else this.errorMessage = error?.response?.data?.message || 'No fue posible guardar el perfil.';
    } finally { this.saving = false; this.refresh(); }
  }

  // Si falla la red, mantiene la sesión para poder reintentar la revocación.
  async logout(): Promise<void> {
    if (this.closing || this.loading || this.saving) return;
    this.closing = true;
    this.errorMessage = '';
    this.refresh();
    try {
      await this.auth.logout();
      this.user = null;
      await this.router.navigateByUrl('/login', { replaceUrl: true });
    } catch (error: any) {
      this.errorMessage = error?.response?.data?.message ||
        'No se confirmó el cierre en el servidor. Recupera conexión y vuelve a intentarlo.';
    } finally {
      this.closing = false;
      this.refresh();
    }
  }

  ngOnDestroy(): void { this.destroyed = true; this.version++; }
}
