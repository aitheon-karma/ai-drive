import { Observable } from 'rxjs/Observable';
import { Injectable } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { AuthService } from '@aitheon/core-client';

@Injectable()
export class AdminGuard implements CanActivate {

    constructor(
        private authService: AuthService
    ) { }

    canActivate(): Observable<boolean> | boolean {
      if (this.getAdmin()) {
          return true;
      }
      return false;
  }

  getAdmin() {
      return this.authService.currentUser.subscribe((user: any) => {
        return user.sysadmin;
      });
  }

}
