/** Dashboard D3: consulta datos reales, aplica filtros y permite explorar cada valor. */
import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, ChangeDetectorRef, OnDestroy, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular';
import * as d3 from 'd3';
import { BusinessService } from '../services/business.service';
import { AuthService } from '../services/auth.service';

type Value = { label: string; total: number };
@Component({
  selector: 'app-dashboard', standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent],
  templateUrl: './dashboard.page.html', styleUrls: ['./dashboard.page.scss']
})
export class DashboardPage implements OnDestroy {
  @ViewChild('plots', { static: true }) plots!: ElementRef<HTMLElement>;
  from = `${new Date().getUTCFullYear()}-01-01`;
  to = `${new Date().getUTCFullYear()}-12-31`;
  department = ''; departments: { id: number; name: string }[] = [];
  loading = false; error = ''; detail = ''; updated = ''; applied = ''; scope = '';
  online = navigator.onLine; active = false;
  values: Value[][] = [[], [], [], []];
  titles = ['Tareas por empleado', 'Tareas por estado', 'Tareas completadas por mes', 'Solicitudes por departamento'];
  notes = ['Según fecha de creación · todos los estados', 'Estado actual de tareas creadas en el periodo', 'Según fecha de finalización · meses en UTC', 'Según fecha de creación · departamento destinatario'];
  colors = ['#ff9b91', '#c4a1ff', '#78dfc4', '#f2cb78'];
  private sequence = 0;
  private observer?: ResizeObserver;
  private resizeTimer?: ReturnType<typeof setTimeout>;
  private connection = () => { this.online = navigator.onLine; this.cd.detectChanges(); };
  constructor(private api: BusinessService, private auth: AuthService, private router: Router,
    private cd: ChangeDetectorRef, private zone: NgZone) {}

  ionViewDidEnter(): void {
    this.active = true; this.online = navigator.onLine;
    window.addEventListener('online', this.connection); window.addEventListener('offline', this.connection);
    this.observer = new ResizeObserver(() => {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => { if (this.active) this.render(); }, 100);
    });
    this.observer.observe(this.plots.nativeElement);
    void this.load(true);
  }
  ionViewWillLeave(): void {
    this.active = false; this.sequence++; this.observer?.disconnect(); clearTimeout(this.resizeTimer);
    window.removeEventListener('online', this.connection); window.removeEventListener('offline', this.connection);
    this.values = [[], [], [], []]; this.detail = ''; this.updated = ''; this.applied = ''; this.loading = false;
    d3.select(this.plots.nativeElement).selectAll('svg').remove();
  }
  ngOnDestroy(): void { this.ionViewWillLeave(); }
  get totals(): number[] { return this.values.map(rows => d3.sum(rows, d => d.total)); }
  async load(initial = false): Promise<void> {
    if (this.loading) return;
    if (!this.from || !this.to || this.from > this.to) { this.error = 'Selecciona un periodo válido: inicio anterior o igual al fin.'; return; }
    const token = sessionStorage.getItem('auth_token'); const request = ++this.sequence;
    this.loading = true; this.error = ''; this.detail = ''; this.values = [[], [], [], []]; this.updated = ''; this.applied = '';
    this.render(); this.cd.detectChanges();
    try {
      const profile = await this.auth.getProfile();
      if (request !== this.sequence || !this.active || token !== sessionStorage.getItem('auth_token')) return;
      this.scope = profile.role === 'admin' ? 'Vista general de la empresa' : 'Mis tareas y solicitudes en las que participo';
      const query = new URLSearchParams({ from: this.from, to: this.to });
      if (this.department) query.set('department_id', this.department);
      const endpoints = ['dashboard-tasks-by-employee.php', 'dashboard-tasks-by-status.php', 'dashboard-completed-monthly.php', 'dashboard-requests-by-department.php'];
      const result = await Promise.all([
        ...endpoints.map(name => this.api.request('GET', `${name}?${query}`)),
        this.api.request('GET', 'departments.php')
      ]);
      if (request !== this.sequence || !this.active || token !== sessionStorage.getItem('auth_token')) return;
      const labels: Record<string, string> = { pending: 'Pendientes', in_progress: 'En progreso', completed: 'Completadas', cancelled: 'Canceladas' };
      const fields = ['employee_name', 'status', 'month', 'department_name'];
      this.values = result.slice(0, 4).map((rows, i) => {
        if (!Array.isArray(rows)) throw new Error('Respuesta de gráfica inválida.');
        return rows.map(row => {
          if (typeof row[fields[i]] !== 'string' || !Number.isInteger(row.total) || row.total < 0) throw new Error('Datos de gráfica inválidos.');
          return { label: labels[row[fields[i]]] || row[fields[i]], total: row.total };
        });
      });
      this.departments = result[4];
      this.updated = new Date().toLocaleString('es-MX');
      this.applied = `${this.from} al ${this.to} · ${this.departments.find(d => String(d.id) === this.department)?.name || 'Todos los departamentos'}`;
      this.render();
    } catch (e: any) {
      if (request !== this.sequence || !this.active || token !== sessionStorage.getItem('auth_token')) return;
      this.values = [[], [], [], []]; this.render();
      if ((e?.response?.status ?? e?.status) === 401) {
        this.auth.clearLocalSession(); await this.router.navigateByUrl('/login', { replaceUrl: true });
      } else this.error = e?.response?.data?.message || e?.message || 'No fue posible consultar la API. Verifica la conexión y vuelve a intentar.';
    } finally {
      if (request === this.sequence && this.active) { this.loading = false; this.cd.detectChanges(); }
    }
  }
  private interact(selection: any, text: (d: any) => string): void {
    selection.attr('tabindex', 0).attr('role', 'button').attr('aria-label', text)
      .on('pointerenter focus click', (_event: Event, d: any) => {
        this.zone.run(() => { this.detail = text(d); this.cd.detectChanges(); });
      }).on('keydown', (event: KeyboardEvent, d: any) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); this.zone.run(() => { this.detail = text(d); this.cd.detectChanges(); }); }
      }).append('title').text(text);
  }
  private render(): void {
    if (!this.plots) return;
    const hosts = this.plots.nativeElement.querySelectorAll<HTMLElement>('.chart');
    hosts.forEach((host, index) => {
      d3.select(host).selectAll('*').remove();
      const rows = this.values[index];
      if (!rows.length || !d3.sum(rows, d => d.total)) return;
      const width = Math.max(300, host.clientWidth);
      const height = index === 3 ? Math.max(300, rows.length * 38 + 60) : 330;
      const svg = d3.select(host).append('svg').attr('viewBox', `0 0 ${width} ${height}`)
        .attr('width', width).attr('height', height).attr('role', 'group').attr('aria-label', this.titles[index])
        .style('color', '#c7ccdc').style('font', '12px Arial');
      const describe = (d: Value) => `${this.titles[index]} · ${d.label}: ${d.total}`;
      if (index === 1) {
        const radius = Math.min(width / 2 - 15, 140);
        const arcs = d3.pie<Value>().sort(null).value(d => d.total)(rows);
        const arc = d3.arc<d3.PieArcDatum<Value>>().innerRadius(radius * .64).outerRadius(radius);
        const group = svg.append('g').attr('transform', `translate(${width / 2},165)`);
        const paths = group.selectAll('path').data(arcs.filter(d => d.value > 0)).join('path').attr('d', arc)
          .attr('fill', d => this.colors[d.index]).attr('stroke', '#252938').attr('stroke-width', 3);
        this.interact(paths, d => `${describe(d.data)} (${(d.data.total / this.totals[1] * 100).toFixed(1)}%)`);
        group.append('text').attr('text-anchor', 'middle').attr('fill', '#fff').style('font-size', '30px').text(this.totals[1]);
        group.append('text').attr('text-anchor', 'middle').attr('y', 25).attr('fill', '#c7ccdc').text('tareas');
      } else if (index === 3) {
        const left = Math.min(150, width * .38); const bottom = height - 35;
        const x = d3.scaleLinear().domain([0, d3.max(rows, d => d.total) || 1]).nice().range([left, width - 30]);
        const y = d3.scaleBand<number>().domain(rows.map((_, i) => i)).range([15, bottom]).padding(.24);
        svg.append('g').attr('transform', `translate(0,${bottom})`).call(d3.axisBottom(x).ticks(4).tickFormat(d3.format('d')));
        svg.append('g').attr('transform', `translate(${left},0)`).call(d3.axisLeft(y).tickFormat(i => this.short(rows[i].label, 19)));
        const bars = svg.selectAll('rect').data(rows).join('rect').attr('x', left).attr('y', (_, i) => y(i)!)
          .attr('height', y.bandwidth()).attr('width', d => x(d.total) - left).attr('fill', this.colors[index]).attr('rx', 4);
        this.interact(bars, describe);
        svg.selectAll('.value').data(rows).join('text').attr('x', d => x(d.total) + 5).attr('y', (_, i) => y(i)! + y.bandwidth() / 2 + 4).attr('fill', '#fff').text(d => d.total);
      } else {
        const bottom = 235; const right = Math.max(width - 22, 60);
        const y = d3.scaleLinear().domain([0, d3.max(rows, d => d.total) || 1]).nice().range([bottom, 20]);
        const x = d3.scaleBand<number>().domain(rows.map((_, i) => i)).range([42, right]).padding(.25);
        svg.append('g').attr('transform', 'translate(42,0)').call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('d')));
        const tickEvery = Math.max(1, Math.ceil(rows.length / 12));
        svg.append('g').attr('transform', `translate(0,${bottom})`).call(d3.axisBottom(x)
          .tickValues(rows.map((_, i) => i).filter(i => i % tickEvery === 0)).tickFormat(i => this.short(rows[i].label, 15)))
          .selectAll('text').attr('transform', 'rotate(-40)').attr('text-anchor', 'end').attr('dx', '-.5em').attr('dy', '.5em');
        if (index === 0) {
          const bars = svg.selectAll('rect').data(rows).join('rect').attr('x', (_, i) => x(i)!).attr('y', d => y(d.total))
            .attr('width', x.bandwidth()).attr('height', d => bottom - y(d.total)).attr('fill', this.colors[index]).attr('rx', 4);
          this.interact(bars, describe);
        } else {
          const line = d3.line<Value>().x((_, i) => x(i)! + x.bandwidth() / 2).y(d => y(d.total));
          svg.append('path').datum(rows).attr('d', line).attr('fill', 'none').attr('stroke', this.colors[index]).attr('stroke-width', 3);
          const points = svg.selectAll('circle').data(rows).join('circle').attr('cx', (_, i) => x(i)! + x.bandwidth() / 2)
            .attr('cy', d => y(d.total)).attr('r', 6).attr('fill', this.colors[index]);
          this.interact(points, describe);
        }
      }
    });
  }
  private short(text: string, max: number): string { return text.length > max ? text.slice(0, max - 1) + '…' : text; }
}
