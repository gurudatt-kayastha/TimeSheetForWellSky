import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { AlertConfig } from '../components/custom-alert/custom-alert.component';

@Injectable({
  providedIn: 'root'
})
export class CustomAlertService {
  private alertSubject = new Subject<AlertConfig>();
  private responseSubject = new Subject<boolean>();

  alert$: Observable<AlertConfig> = this.alertSubject.asObservable();

  /**
   * Show an info alert
   */
  info(title: string, message: string): void {
    this.alertSubject.next({
      title,
      message,
      type: 'info',
      confirmText: 'OK',
      showCancel: false
    });
  }

  /**
   * Show a warning alert
   */
  warning(title: string, message: string): void {
    this.alertSubject.next({
      title,
      message,
      type: 'warning',
      confirmText: 'OK',
      showCancel: false
    });
  }

  /**
   * Show an error alert
   */
  error(title: string, message: string): void {
    this.alertSubject.next({
      title,
      message,
      type: 'error',
      confirmText: 'OK',
      showCancel: false
    });
  }

  /**
   * Show a success alert
   */
  success(title: string, message: string): void {
    this.alertSubject.next({
      title,
      message,
      type: 'success',
      confirmText: 'OK',
      showCancel: false
    });
  }

  /**
   * Show a confirmation dialog
   * Returns a Promise that resolves to true if confirmed, false if cancelled
   */
  confirm(title: string, message: string, confirmText: string = 'Confirm', cancelText: string = 'Cancel'): Promise<boolean> {
    this.alertSubject.next({
      title,
      message,
      type: 'confirm',
      confirmText,
      cancelText,
      showCancel: true
    });

    return new Promise((resolve) => {
      const subscription = this.responseSubject.subscribe((result) => {
        resolve(result);
        subscription.unsubscribe();
      });
    });
  }

  /**
   * Send response for confirmation dialogs
   */
  sendResponse(confirmed: boolean): void {
    this.responseSubject.next(confirmed);
  }
}