import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnChanges, OnDestroy, ViewChild, input } from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { AttendanceChartPoint } from '../models/attendance-analytics.model';

Chart.register(...registerables);

@Component({
  selector: 'attendance-chart',
  templateUrl: './attendance-chart.component.html',
  styleUrl: './attendance-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('canvasRef')
  private canvasRef?: ElementRef<HTMLCanvasElement>;

  private chart: Chart<'bar'> | null = null;
  private hasViewInitialized = false;

  public readonly data = input.required<AttendanceChartPoint[]>();

  public ngAfterViewInit(): void {
    this.hasViewInitialized = true;
    this.renderChart();
  }

  public ngOnChanges(): void {
    this.renderChart();
  }

  public ngOnDestroy(): void {
    this.chart?.destroy();
    this.chart = null;
  }

  private renderChart(): void {
    if (!this.hasViewInitialized) {
      return;
    }

    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      return;
    }

    const points = this.data();

    if (this.chart) {
      this.chart.data.labels = points.map((item) => item.name);
      this.chart.data.datasets[0].data = points.map((item) => item.value);
      this.chart.update('none');
      return;
    }

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: points.map((item) => item.name),
        datasets: [
          {
            label: 'Посещаемость, %',
            data: points.map((item) => item.value),
            backgroundColor: '#3f51b5',
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 0,
            max: 100,
          },
        },
        plugins: {
          legend: {
            display: false,
          },
        },
      },
    };

    try {
      this.chart = new Chart(canvas, config);
    } catch (error) {
      console.error('[attendance-chart] render error', error);
    }
  }
}

