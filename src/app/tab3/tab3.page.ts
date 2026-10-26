/** Gestiona departamentos, tareas y solicitudes usando datos reales de la API. */
import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { UserService } from '../services/user.service';
import { BusinessService } from '../services/business.service';
import { AuthService, SessionUser } from '../services/auth.service';

@Component({
  selector: 'app-tab3', standalone: true,
  templateUrl: './tab3.page.html', styleUrls: ['./tab3.page.scss'],
  imports: [CommonModule, FormsModule, IonContent]
})
export class Tab3Page implements OnDestroy {
  section: 'departments' | 'tasks' | 'requests' = 'tasks';
  me: SessionUser | null = null;
  departments: any[] = [];
  employees: any[] = [];
  tasks: any[] = [];
  requests: any[] = [];
  loading = false;
  saving = false;
  errorMessage = '';
  message = '';
  statusFilter = '';
  departmentForm = { id: null as number | null, name: '', description: '' };
  taskForm = this.emptyTask();
  requestForm = this.emptyRequest();
  selectedRequest: any = null;
  assignment: number | null = null;
  nextRequestStatus = 'resolved';
  resolution = '';
  private destroyed = false;
  private version = 0;

  constructor(
    private api: BusinessService,
    private users: UserService,
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  get admin(): boolean { return this.me?.role === 'admin'; }
  get busy(): boolean { return this.loading || this.saving; }
  get activeDepartments(): any[] { return this.departments.filter(d => d.status === 'active'); }
  get activeEmployees(): any[] {
    return this.employees.filter(u => u.status === 'active' && u.department_id &&
      this.activeDepartments.some(d => +d.id === +u.department_id));
  }
  get requestAssignees(): any[] {
    return this.activeEmployees.filter(u => +u.department_id === +this.selectedRequest?.department_id);
  }
  get visibleTasks(): any[] { return this.tasks.filter(t => !this.statusFilter || t.status === this.statusFilter); }
  get visibleRequests(): any[] { return this.requests.filter(r => !this.statusFilter || r.status === this.statusFilter); }

  label(value: string): string {
    const labels: Record<string, string> = {
      pending: 'Pendiente', in_progress: 'En proceso', completed: 'Completada', cancelled: 'Cancelada',
      in_review: 'En revisión', resolved: 'Resuelta', rejected: 'Rechazada',
      low: 'Baja', medium: 'Media', high: 'Alta', active: 'Activo', inactive: 'Inactivo'
    };
    return labels[value] || value;
  }

  ionViewWillEnter(): void { void this.load(); }
  ionViewWillLeave(): void { this.version++; this.loading = false; }
  ngOnDestroy(): void { this.destroyed = true; this.version++; }
  private refresh(): void { if (!this.destroyed) this.cdr.detectChanges(); }

  // La API verifica el rol; la interfaz utiliza el perfil real para mostrar acciones.
  async load(): Promise<void> {
    if (this.loading) return;
    const version = ++this.version;
    this.loading = true; this.errorMessage = ''; this.refresh();
    try {
      const me = await this.auth.getProfile();
      const [departments, tasks, requests, employeeResponse] = await Promise.all([
        this.api.request('GET', 'departments.php'), this.api.request('GET', 'tasks.php'),
        this.api.request('GET', 'requests.php'),
        me.role === 'admin' ? this.getEmployees() : Promise.resolve([])
      ]);
      if (this.destroyed || version !== this.version) return;
      this.me = me; this.departments = departments; this.tasks = tasks; this.requests = requests;
      this.employees = employeeResponse;
    } catch (error: any) {
      if (version !== this.version || this.destroyed) return;
      this.departments = []; this.tasks = []; this.requests = []; this.employees = [];
      await this.handleError(error);
    } finally {
      if (version === this.version) { this.loading = false; this.refresh(); }
    }
  }

  // Conserva el contrato del CRUD existente.
  private getEmployees(): Promise<any[]> { return this.users.getUsers(); }

  select(section: 'departments' | 'tasks' | 'requests'): void {
    if (this.busy) return;
    this.section = section; this.statusFilter = ''; this.errorMessage = ''; this.message = '';
    this.selectedRequest = null;
  }

  private async handleError(error: any): Promise<void> {
    if (error?.response?.status === 401 || error?.status === 401) {
      this.auth.clearLocalSession();
      await this.router.navigateByUrl('/login', { replaceUrl: true });
    } else this.errorMessage = error?.response?.data?.message || error?.message || 'No se pudo conectar con la API.';
  }

  private async mutate(operation: () => Promise<any>, done: () => void): Promise<void> {
    if (this.busy) return;
    if (!navigator.onLine) { this.errorMessage = 'Estas operaciones requieren conexión con el servidor.'; return; }
    this.saving = true; this.errorMessage = ''; this.message = ''; this.refresh();
    try {
      await operation(); done(); this.message = 'Operación guardada correctamente.';
      await this.load();
    } catch (error) { await this.handleError(error); }
    finally { this.saving = false; this.refresh(); }
  }

  saveDepartment(): Promise<void> {
    const f = { ...this.departmentForm };
    return this.mutate(() => this.api.request(f.id ? 'PUT' : 'POST', `departments.php${f.id ? '?id=' + f.id : ''}`, f),
      () => this.departmentForm = { id: null, name: '', description: '' });
  }
  editDepartment(d: any): void { this.departmentForm = { id: +d.id, name: d.name, description: d.description || '' }; }
  toggleDepartment(d: any): Promise<void> {
    return this.mutate(() => this.api.request('PATCH', `departments.php?id=${d.id}`,
      { status: d.status === 'active' ? 'inactive' : 'active' }), () => {});
  }
  cancelDepartment(): void { this.departmentForm = { id: null, name: '', description: '' }; }

  saveTask(): Promise<void> {
    const f = { ...this.taskForm };
    return this.mutate(() => this.api.request(f.id ? 'PUT' : 'POST', `tasks.php${f.id ? '?id=' + f.id : ''}`, f),
      () => this.taskForm = this.emptyTask());
  }
  editTask(t: any): void {
    this.taskForm = { id: +t.id, title: t.title, description: t.description || '',
      assigned_to: +t.assigned_to, priority: t.priority, due_date: t.due_date };
  }
  cancelTaskEdit(): void { this.taskForm = this.emptyTask(); }
  taskStatus(t: any, status: string): Promise<void> {
    return this.mutate(() => this.api.request('PATCH', `tasks.php?id=${t.id}`, { status }), () => {});
  }
  private emptyTask() {
    return { id: null as number | null, title: '', description: '', assigned_to: null as number | null,
      priority: 'medium', due_date: '' };
  }

  saveRequest(): Promise<void> {
    const f = { ...this.requestForm };
    return this.mutate(() => this.api.request(f.id ? 'PUT' : 'POST', `requests.php${f.id ? '?id=' + f.id : ''}`, f),
      () => this.requestForm = this.emptyRequest());
  }
  editRequest(r: any): void { this.requestForm = { id: +r.id, subject: r.subject, description: r.description, department_id: +r.department_id }; }
  cancelRequestEdit(): void { this.requestForm = this.emptyRequest(); }
  private emptyRequest() { return { id: null as number | null, subject: '', description: '', department_id: null as number | null }; }
  canEditRequest(r: any): boolean {
    return r.status === 'pending' && r.assigned_to === null && (this.admin || +r.requested_by === this.me?.id);
  }
  canResolve(r: any): boolean { return r.status === 'in_review' && (this.admin || +r.assigned_to === this.me?.id); }
  canCancel(r: any): boolean {
    return ['pending', 'in_review'].includes(r.status) && (this.admin || (r.status === 'pending' && +r.requested_by === this.me?.id));
  }
  openRequest(r: any): void {
    this.selectedRequest = r; this.assignment = r.assigned_to ? +r.assigned_to : null; this.resolution = '';
    this.nextRequestStatus = this.canResolve(r) ? 'resolved' : (this.admin ? 'rejected' : 'cancelled');
  }
  assignRequest(): Promise<void> {
    const id = this.selectedRequest.id;
    return this.mutate(() => this.api.request('PATCH', `request-assignment.php?id=${id}`, { assigned_to: this.assignment }),
      () => this.selectedRequest = null);
  }
  finishRequest(): Promise<void> {
    const id = this.selectedRequest.id;
    return this.mutate(() => this.api.request('PATCH', `requests.php?id=${id}`,
      { status: this.nextRequestStatus, resolution: this.resolution }), () => this.selectedRequest = null);
  }
}
