import { Component, Output, EventEmitter, Input } from '@angular/core';
import { ServiceDocument, Service, FoldersService } from '../shared';
import { ToastrService } from 'ngx-toastr';
import { FoldersRestService } from '@aitheon/drive';

import { forkJoin } from 'rxjs';

@Component({
  selector: 'ai-services-list',
  templateUrl: './services-list.component.html',
  styleUrls: ['./services-list.component.scss']
})
export class ServicesListComponent {

  @Input() selectedServiceKey: string;
  @Input() services: ServiceDocument[];
  @Output() selectService = new EventEmitter<{
    _id?: string,
    keyPublic?: boolean,
    breadcrumbName?: string,
    keyId?: string,
    folderId?: string,
    service?: Service,
  }>();
  openedService: string;

  constructor(
    private foldersService: FoldersService,
    private foldersRestService: FoldersRestService,
    private toastr: ToastrService
  ) {}

  toggleService(service: Service, event: Event) {
    this.stopEvent(event);
    service.opened = !service.opened;
    if (!service.opened) {
      return;
    }
    this.selectService.emit({ service });
    this.openedService = service._id;
    service.isLoading = true;

    forkJoin([
      this.foldersService.serviceKeys(service._id),
      this.foldersRestService.listServicesFolders(service._id),
    ]).subscribe(([serviceKeys, folders]) => {
      service.keys = serviceKeys.map(key => {
        if (!key.name) {
          return {
            ...key,
            name: 'Shared',
          };
        }
        return key;
      });
      service.folders = folders;
      service.isLoading = false;
    }, (error: Error) => {
      service.isLoading = false;
      service.opened = false;
      this.toastr.error(error.message || 'Unable to get service folders');
    });
  }

  onServiceKeyClick(event: Event, service: ServiceDocument, key) {
    this.stopEvent(event);
    this.selectService.emit({
      // @ts-ignore
      service: service,
      keyId: key._id,
      keyPublic: key.public,
      breadcrumbName: key.name,
    });
    this.openedService = service._id;
  }

  onServiceFolderClick(event: Event, service: ServiceDocument, folder) {
    this.stopEvent(event);
    this.selectService.emit({
      // @ts-ignore
      service: service,
      folderId: folder._id,
      keyPublic: folder.public,
      breadcrumbName: folder.dynamicName,
    });
    this.openedService = service._id;
  }

  stopEvent(event: Event) {
    event.stopPropagation();
    event.preventDefault();
  }
}
