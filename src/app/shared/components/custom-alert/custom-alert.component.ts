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
        <div class="delete-dialog" (click)="$event.stopPropagation()">
          <h3>{{ config.title }}</h3>
          <p>{{ config.message }}</p>

          <div class="dialog-actions">
            @if (config.showCancel) {
              <button class="btn-cancel" (click)="onCancel()">
                {{ config.cancelText || 'Cancel' }}
              </button>
            }
            <button
              class="btn-danger"
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
    /* Overlay background */
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
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* Dialog box styling */
    .delete-dialog {
      background: #fff;
      border-radius: 12px;
      max-width: 400px;
      width: 100%;
      text-align: center;
      padding: 20px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .delete-dialog h3 {
      margin-top: 0;
      color: #333;
      font-size: 18px;
      font-weight: 600;
    }

    .delete-dialog p {
      margin: 16px 0;
      color: #666;
      font-size: 14px;
    }

    .dialog-actions {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-top: 20px;
    }

    /* Cancel Button */
    .btn-cancel {
      background: #6c757d;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 8px 20px;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .btn-cancel:hover {
      background: #5a6268;
    }

    /* Danger (Confirm/Delete) Button */
    .btn-danger {
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 8px 20px;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .btn-danger:hover {
      background: #c82333;
    }

    @media (max-width: 768px) {
      .delete-dialog {
        width: 90%;
      }
    }
  `]
})
export class CustomAlertComponent {
  @Input() config: AlertConfig = {
    title: 'Confirm Action',
    message: 'Are you sure?',
    type: 'confirm',
    confirmText: 'OK',
    cancelText: 'Cancel',
    showCancel: true
  };

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  isVisible = false;

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
}
