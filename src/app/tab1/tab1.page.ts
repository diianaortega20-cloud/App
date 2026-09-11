import { Component } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  imports: [
    IonContent,
    FormsModule,
    CommonModule
  ],
})
export class Tab1Page {

  username: string = '';
  password: string = '';

  usernameFocused: boolean = false;
  passwordFocused: boolean = false;

  isLoginAnimating: boolean = false;
  isLoginMoving: boolean = false;

  authenticating: boolean = false;
  authReturning: boolean = false;

  hideLoginContent: boolean = false;
  loginSuccess: boolean = false;

  constructor() {}

  login(): void {

    if (this.isLoginAnimating) {
      return;
    }

    this.isLoginAnimating = true;

    setTimeout(() => {
      this.isLoginMoving = true;
    }, 300);

    setTimeout(() => {
      this.authenticating = true;
    }, 500);

    setTimeout(() => {
      this.authReturning = true;
      this.authenticating = false;
      this.isLoginMoving = false;
    }, 2500);

    setTimeout(() => {
      this.isLoginAnimating = false;
      this.hideLoginContent = true;
    }, 2800);

    setTimeout(() => {
      this.loginSuccess = true;
    }, 3200);
  }
}