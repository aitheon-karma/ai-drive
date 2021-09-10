import { Component, OnInit, ViewContainerRef } from '@angular/core';
import { AuthService } from '@aitheon/core-client';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'ai-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  currentUser: any;
  navOpened = false;
  isIframe: Boolean;
  serviceEnabled: Boolean;
  serviceName = 'Drive';

  constructor(
    public authService: AuthService,
    public toastr: ToastrService, vcr: ViewContainerRef
  ) {
    this.authService.currentUser.subscribe((user: any) => {
      this.currentUser = user;
    })
  }

  ngOnInit() {
    this.authService.loggedIn.subscribe((loggedIn: boolean) => {
      console.log('loggedIn ', loggedIn);
      if (!loggedIn){
        document.body.className += ' nouser';
      }
    });
    this.isIframe = this.checkIframe();
    this.authService.services.subscribe((services: any) => {
      const messagesService = services.find((s: any) => s._id === 'MESSAGES');
      this.serviceEnabled = !!messagesService;
    });
  }

  toggleMenu() {
    this.navOpened = !this.navOpened;
  }

  checkIframe(): boolean{
    try {
      return window.self !== window.top;
    } catch (e) {
      return false;
    }
  }

}
