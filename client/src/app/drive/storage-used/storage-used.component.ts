import { Component, OnInit, Input, OnChanges } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { UsersSettingsService } from '../shared/user-settings.service';
import { UserSettings } from '../shared/user-settings';

@Component({
  selector: 'fl-storage-used',
  templateUrl: './storage-used.component.html',
  styleUrls: ['./storage-used.component.scss']
})
export class StorageUsedComponent implements OnInit, OnChanges {

  @Input('settings') settings: UserSettings;
  spaceType = 'primary';

  constructor(
    private userSettingsService: UsersSettingsService,
    private toastr: ToastrService,
  ) { }

  ngOnInit() {
  }

  ngOnChanges(): void {
    if (this.settings){
      const used = (this.settings.space.used / this.settings.space.total);
      if (used > 0.8 && used < 0.9){
        this.spaceType = 'warning';
      } else if (used > 0.9) {
        this.spaceType = 'danger';
      }

    }
  }

}
