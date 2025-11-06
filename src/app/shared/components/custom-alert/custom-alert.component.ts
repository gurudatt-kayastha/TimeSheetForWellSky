import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface AlertConfig {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'confirm';
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
}

@Component({
  selector: 'app-custom-alert',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isVisible) {
      <div class="alert-overlay" (click)="onOverlayClick()">
        <div class="alert-container" (click)="$event.stopPropagation()">
          <div class="alert-header" [ngClass]="'alert-' + config.type">
            <div class="alert-icon">
              {{ getIcon() }}
            </div>
            <h3 class="alert-title">{{ config.title }}</h3>
          </div>
          
          <div class="alert-body">
            <p class="alert-message">{{ config.message }}</p>
          </div>
          
          <div class="alert-footer">
            @if (config.showCancel) {
              <button class="btn-cancel" (click)="onCancel()">
                {{ config.cancelText || 'Cancel' }}
              </button>
            }
            <button 
              class="btn-confirm" 
              [ngClass]="'btn-' + config.type"
              (click)="onConfirm()"
            >
              {{ config.confirmText || 'OK' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .alert-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .alert-container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      min-width: 400px;
      max-width: 500px;
      animation: slideUp 0.3s ease;
      overflow: hidden;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .alert-header {
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid #e9ecef;
    }

    .alert-icon {
      font-size: 28px;
      line-height: 1;
    }

    .alert-title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #343a40;
    }

    .alert-info {
      background-color: #e7f3ff;
      border-left: 4px solid #007bff;
    }

    .alert-warning {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
    }

    .alert-error {
      background-color: #f8d7da;
      border-left: 4px solid #dc3545;
    }

    .alert-success {
      background-color: #d4edda;
      border-left: 4px solid #28a745;
    }

    .alert-confirm {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
    }

    .alert-body {
      padding: 20px;
    }

    .alert-message {
      margin: 0;
      font-size: 14px;
      line-height: 1.6;
      color: #495057;
    }

    .alert-footer {
      padding: 15px 20px;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      background-color: #f8f9fa;
      border-top: 1px solid #e9ecef;
    }

    .btn-cancel,
    .btn-confirm {
      padding: 8px 20px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-cancel {
      background-color: #6c757d;
      color: white;
    }

    .btn-cancel:hover {
      background-color: #5a6268;
    }

    .btn-confirm {
      color: white;
    }

    .btn-info {
      background-color: #007bff;
    }

    .btn-info:hover {
      background-color: #0056b3;
    }

    .btn-warning,
    .btn-confirm {
      background-color: #ffc107;
      color: #000;
    }

    .btn-warning:hover,
    .btn-confirm:hover {
      background-color: #e0a800;
    }

    .btn-error {
      background-color: #dc3545;
    }

    .btn-error:hover {
      background-color: #c82333;
    }

    .btn-success {
      background-color: #28a745;
    }

    .btn-success:hover {
      background-color: #218838;
    }

    @media (max-width: 768px) {
      .alert-container {
        min-width: 90%;
        max-width: 90%;
        margin: 0 20px;
      }
    }
  `]
})
export class CustomAlertComponent {
  @Input() config: AlertConfig = {
    title: 'Alert',
    message: '',
    type: 'info',
    confirmText: 'OK',
    cancelText: 'Cancel',
    showCancel: false
  };

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  isVisible: boolean = false;

  show(): void {
    this.isVisible = true;
  }

  hide(): void {
    this.isVisible = false;
    this.close.emit();
  }

  onConfirm(): void {
    this.confirm.emit();
    this.hide();
  }

  onCancel(): void {
    this.cancel.emit();
    this.hide();
  }

  onOverlayClick(): void {
    if (this.config.type !== 'confirm') {
      this.hide();
    }
  }

  getIcon(): string {
    const icons = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      success: '✅',
      confirm: '❓'
    };
    return icons[this.config.type] || icons.info;
  }
}