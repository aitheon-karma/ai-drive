import { Observable } from 'rxjs/Observable';
import { Injectable } from '@angular/core';
import { RestService } from '@aitheon/core-client';
import { UserSettings } from './user-settings';

@Injectable()
export class UsersSettingsService {

  constructor(private restService: RestService) { }

  me(): Observable<UserSettings> {
    return this.restService.fetch(`/api/user-settings`);
  }

}
