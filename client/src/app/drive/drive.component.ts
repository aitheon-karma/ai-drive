import { DocumentsRestService } from '@aitheon/drive';
import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { Folder, Document, FoldersService, DocumentsService, Service } from './shared';
import { AuthService } from '@aitheon/core-client';
import { BsModalService } from 'ngx-bootstrap/modal';
import { BsModalRef } from 'ngx-bootstrap/modal/bs-modal-ref.service';
import { ServiceDocument } from './shared/service-document';
import { ContextMenuComponent } from 'ngx-contextmenu';
import { ShareService } from './shared/share.service';
import { ToastrService } from 'ngx-toastr';
import { ShareFormComponent } from './share-form/share-form.component';
import { ActivatedRoute, Router } from '@angular/router';
import { DocumentsListComponent } from './documents-list/documents-list.component';
import { UsersSettingsService } from './shared/user-settings.service';
import { UserSettings } from './shared/user-settings';
import { GenericConfirmComponent } from '../shared/generic-confirm/generic-confirm.component';

@Component({
  selector: 'ai-drive',
  templateUrl: './drive.component.html',
  styleUrls: ['./drive.component.scss']
})
export class DriveComponent implements OnInit {

  driveHeader: string;
  isDocumentsLoading = true;
  isFoldersLoading = true;

  myDriveOpened = true;
  shareWithMeOpened = false;
  systemFoldersOpened = false;
  disableShare = false;

  isShareView = false;
  isSharedLinkView = false;

  documents: Document[];

  breadcrumbs: Array<Folder> = [];

  serviceDocuments: ServiceDocument[];

  selectedFolder: Folder;
  selectedService: Service;
  selectedServiceFolder: {
    id: string,
    name: string
  };
  selectedServiceKey: string;
  documentsReadonly: Boolean;
  services: Service[];

  sharedFolders: Folder[];

  editFolder: Folder;
  folders: Folder[];
  inlineFolders: Folder[];
  folderModalRef: BsModalRef;

  uploadDisabled = false;

  selectedContextFolder: Folder;
  hideShared = false;
  currentUser: any;
  settings: UserSettings;
  loggedIn: boolean;
  organization: any;

  get isLoading() {
    return this.isDocumentsLoading || this.isFoldersLoading;
  }

  @ViewChild('foldersMenu') foldersMenu: ContextMenuComponent;
  @ViewChild('folderModal') folderModal: TemplateRef<any>;
  @ViewChild('shareForm') shareForm: ShareFormComponent;
  @ViewChild('documentsList') documentsList: DocumentsListComponent;
  @ViewChild('genericConfirm') genericConfirm: GenericConfirmComponent;

  constructor(
    private authService: AuthService,
    private foldersService: FoldersService,
    private shareService: ShareService,
    private documentsService: DocumentsService,
    private documentsRestService: DocumentsRestService,
    private modalService: BsModalService,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private router: Router,
    private userSettingsService: UsersSettingsService
  ) {
    this.authService.activeOrganization.subscribe((org: any) => {
      // this.hideShared = org ? true : false;
      this.organization = org;
      this.driveHeader = org ? `${org.name} Drive` : 'My Drive';
    });

    this.authService.currentUser.subscribe((user: any) => {
      this.currentUser = user;
    });

    this.authService.loggedIn.subscribe((loggedIn: boolean) => {
      this.loggedIn = loggedIn;
      if (!this.loggedIn) {
        this.uploadDisabled = true;
      }
    });
  }

  ngOnInit() {
    const shareType = this.route.snapshot.params['shareType'];
    const shareId = this.route.snapshot.params['shareId'];
    this.userSettingsService.me().subscribe((settings: UserSettings) => {
      this.settings = settings;
      if (shareType && shareId) {
        this.myDriveOpened = false;
        this.shareWithMeOpened = true;
        this.isShareView = true;
        this.isSharedLinkView = true;
        // this.loadSharedMain();
        if (shareType === 'document') {
          this.loadSharedDocument(shareId);
        } else {
          this.loadSharedFolder(shareId);
          this.loadSharedDocuments(shareId);
        }
      } else {
        this.loadFolders();
        this.loadDocuments();
        this.loadServices();
      }
    }, (err: any) => {
      this.toastr.error(err);
    });
  }

  loadSharedDocument(documentId: string) {
    this.shareService.getDocument(documentId).subscribe((document: Document) => {
      if (!this.documents) {
        this.documents = [];
      }
      this.documents.push(document);
      this.documentsList.openDocument(document);
    }, (err: any) => {
      this.toastr.error(err);
    });
  }

  loadSharedFolder(folderId: string) {
    this.shareService.getFolder(folderId).subscribe((folder: Folder) => {
      if (!this.sharedFolders) {
        this.sharedFolders = [];
      }
      this.sharedFolders.push(folder);

    }, (err: any) => {
      this.toastr.error(err);
    });
  }

  loadSharedMain() {
    this.isDocumentsLoading = true;
    const organizationId = this.organization ? this.organization._id : '';
    this.shareService.listDocuments(null, organizationId).subscribe((documents: Document[]) => {
      this.documents = documents;
      this.isDocumentsLoading = false;
    }, (err: any) => {
      this.toastr.error(err);
    });

    this.shareService.listFolders(null, organizationId).subscribe((folders: Folder[]) => {
      this.sharedFolders = folders.map((f: Folder) => {
        f.isSharedView = true;
        return f;
      });
      this.inlineFolders = this.sharedFolders.slice(0);
    }, (err: any) => {
      this.toastr.error(err);
    });
  }

  loadFolders() {
    this.isFoldersLoading = true;
    this.foldersService.list().subscribe((folders: Folder[]) => {
      this.folders = folders;
      this.inlineFolders = folders.slice(0);
      // this.inlineFolders.forEach((f: Folder) => {
      //   f.children = [];
      // });
      this.isFoldersLoading = false;
    }, (err: any) => {
      this.toastr.error(err);
    });
  }

  loadServices() {
    this.authService.services.subscribe((services: Service[]) => {
      this.services = services.filter((s: Service) => s._id !== 'DRIVE' && s.showAtMenu);
    }, (err: any) => {
      this.toastr.error(err);
    });
  }

  loadDocuments(service?: Service, folderId?: string, keyId?: string) {
    this.documents = null;
    this.isDocumentsLoading = true;
    this.documentsService.list(
      service
        ? service._id
        : '',
      folderId,
      keyId,
    ).subscribe((documents: Document[]) => {
      this.documents = documents;
      this.isDocumentsLoading = false;
    }, (err: any) => {
      this.toastr.error(err);
    });
  }

  loadSharedDocuments(folderId?: string) {
    this.documents = null;
    this.isDocumentsLoading = true;
    this.shareService.listDocuments(folderId).subscribe((documents: Document[]) => {
      this.documents = documents;
      this.isDocumentsLoading = false;
    }, (err: any) => {
      this.toastr.error(err);
    });
  }

  onFolderOpened(event: { folder: Folder, inline: boolean }) {
    if (event.inline) {
      this.inlineFolders = [];
    }
  }

  onDriveSelected() {
    this.onFolderSelected({ folder: null, breadcrumbs: [], isShareView: false, inline: false });
    this.isFoldersLoading = true;
    this.foldersService.list().subscribe((folders: Folder[]) => {
      this.inlineFolders = folders;
      this.isFoldersLoading = false;
    }, (err: any) => {
      this.toastr.error(err);
    });
  }

  onFolderSelected(event: { folder: Folder, breadcrumbs: Folder[], isShareView: boolean, inline: boolean }) {
    this.selectedFolder = event.folder;
    this.selectedService = null;
    this.selectedServiceKey = null;
    this.disableShare = false;
    this.documentsReadonly = false;
    this.isShareView = event.isShareView;
    if (this.isShareView) {
      this.disableShare = true;
      this.uploadDisabled = true;
      this.documentsReadonly = true;
    } else {
      this.uploadDisabled = false;
    }

    // if (event.inline){
    //   console.log('Return on inline folder select');
    //   return;
    // }
    // this.breadcrumbs = event.breadcrumbs;
    if (this.selectedFolder) {
      if (this.selectedFolder.parent) {
        this.loadBreadcrumbs(this.selectedFolder);
      } else {
        this.breadcrumbs = [this.selectedFolder];
      }
      // this.router.navigate(['/folders', this.selectedFolder._id], { replaceUrl: true });
    } else {
      this.breadcrumbs = [];
      // this.router.navigate(['/'], { replaceUrl: true });
    }
    if (this.isShareView) {
      this.loadSharedDocuments(this.selectedFolder ? this.selectedFolder._id : null);
    } else {
      this.loadDocuments(this.selectedService, this.selectedFolder ? this.selectedFolder._id : null);
    }
    // this.inlineFolders = event.folder.children;
  }

  loadBreadcrumbs(folder: Folder) {
    this.foldersService.breadcrumbs(folder._id).subscribe((breadcrumbs: Folder[]) => {
      this.breadcrumbs = breadcrumbs;
      this.breadcrumbs.push(folder);
    }, (err: any) => {
      this.toastr.error(err);
    });
  }

  onFolderChildrenLoaded(event: { folders: Folder[] }) {
    this.inlineFolders = event.folders;
  }

  reccursiveParent(folder: Folder) {
    this.breadcrumbs.unshift(folder);
    if (folder.children) {
      this.reccursiveParent(folder.parentRef);
    }
  }

  selectBreadcrumb(breadcrumb: Folder) {
    const breadcrumbIndex = this.breadcrumbs.findIndex((i: Folder) => i._id === breadcrumb._id);
    const breadcrumbs = this.breadcrumbs.slice(0, breadcrumbIndex + 1);
    this.onFolderSelected({
      folder: breadcrumb,
      breadcrumbs: breadcrumbs,
      isShareView: this.isShareView,
      inline: true
    });
    this.isFoldersLoading = true;
    this.foldersService.list(null, breadcrumb._id).subscribe((folders: Folder[]) => {
      this.inlineFolders = folders;
      this.isFoldersLoading = false;
    }, (err: any) => {
      this.toastr.error(err);
    });
  }

  onSelectService(event: { service: Service, breadcrumbName: string, keyId?: string, folderId?: string, keyPublic: boolean }) {
    this.selectedService = event.service;
    this.documentsReadonly = !!event.keyPublic;
    this.uploadDisabled = true;
    this.disableShare = true;
    this.isShareView = false;
    this.breadcrumbs = [];
    this.inlineFolders = [];
    this.selectedFolder = null;
    this.isDocumentsLoading = true;
    this.selectedServiceFolder = (!event.folderId || event.keyId)
      ? null
      : {
        id: event.folderId || event.keyId,
        name: event.breadcrumbName,
      };

    if (event.folderId && this.organization) {
      this.selectedServiceKey = event.folderId;
      this.loadServiceFolderDocuments(event.service, event.folderId, this.organization._id);
    } else {
      this.selectedServiceKey = event.keyId;
      this.loadDocuments(event.service, '', event.keyId);
    }
  }

  loadServiceFolderDocuments(service: Service, folderId, orgId) {
    this.documents = null;
    this.documentsRestService.list(service._id, folderId, orgId, 1000)
      .subscribe(documents => {
        this.documents = documents;
        this.isDocumentsLoading = false;
      }, (error: Error) => {
        this.toastr.error(error.message || 'Unable to load documents!');
        this.isDocumentsLoading = false;
      });
  }

  showEditFolder(folder: Folder, isNew: boolean) {
    this.editFolder = {} as Folder;
    if (isNew) {
      if (folder) {
        this.editFolder.parent = folder._id;
        this.editFolder.parentRef = folder;
      }
    } else {
      this.editFolder = folder;
    }
    this.folderModalRef = this.modalService.show(this.folderModal);
  }

  onFolderSaved(result: { folder: Folder, isNew: boolean }) {
    let folders = result.folder.parentRef ? result.folder.parentRef.children : this.folders;
    folders = folders || [];
    const index = folders.findIndex((i) => i._id === result.folder._id);

    if (result.isNew) {
      if (!folders) {
        folders = [];
      }
      if (index === -1) {
        if (!result.folder.parentRef || (result.folder.parentRef && result.folder.parentRef.opened)) {
          folders.push(result.folder);
        }
      } else {
        folders[index] = Object.assign(folders[index], result.folder);
      }
    } else {
      this.editFolder = Object.assign(this.editFolder, result.folder);
    }

    result.folder.createdBy = this.currentUser;
    if (!result.folder.parent && !this.selectedFolder) {
      this.inlineFolders.push(result.folder);
    } else if (result.folder.parent && this.selectedFolder && this.selectedFolder._id === result.folder.parent) {
      this.inlineFolders.push(result.folder);
    }

    const breadIndex = this.breadcrumbs.findIndex((f: Folder) => f._id === result.folder._id);
    if (breadIndex > -1) {
      this.breadcrumbs[breadIndex] = result.folder;
    }

    this.folderModalRef.hide();
  }

  onFolderCanceled() {
    this.folderModalRef.hide();
  }

  onSuccessItem(document: Document) {
    this.settings.space.used += document.size;
    this.documents.push(document);
  }

  onFolderContextMenu(folder: Folder, evt: any) {
    if (folder) {
      folder.inlineContextSelected = (' ' + evt.event.currentTarget.className + ' ').indexOf(' ' + 'folder-inline' + ' ') > -1;
    }
    this.selectedContextFolder = folder;
  }

  onFolderContextClose(folder: Folder) {
    console.log('onFolderContextClose', folder);
    this.selectedContextFolder = null;
  }

  onSharedWithMeSelected() {
    if (!this.currentUser) {
      return;
    }
    this.selectedService = null;
    this.selectedServiceKey = null;
    this.selectedFolder = null;
    this.breadcrumbs = [];
    this.uploadDisabled = true;
    this.disableShare = true;
    this.documentsReadonly = true;
    this.isShareView = true;
    this.inlineFolders = [];

    this.loadSharedMain();

  }

  toggleMyDrive() {
    this.myDriveOpened = !this.myDriveOpened;
  }

  toggleSharedWithMe() {
    this.shareWithMeOpened = !this.shareWithMeOpened;
  }

  toggleSystemFolders() {
    this.systemFoldersOpened = !this.systemFoldersOpened;
  }

  showFolderShare(folder: Folder) {
    this.shareForm.show('folder', folder);
  }

  public isSharedFolder = (item: any): boolean => {
    console.log('item.isShared', item.isShared);
    return item.isShared;
  }

  onShareSaved(event: { isShared: boolean, shareItem: Document | Folder, shareType: string }) {
    event.shareItem.isShared = event.isShared;
    if (event.shareType === 'folder') {
      this.documents.filter((d: Document) => d.folder === event.shareItem._id).forEach((d: Document) => d.isShared = event.isShared);
      this.updateIsShared(event.shareItem as Folder, event.isShared);
    }
  }

  public allowFolderEdits = (item: any): boolean => {
    return item && !item.isSharedView || !item;
  }

  public folderNoOptions = (item: any): boolean => {
    return item && item.isSharedView;
  }

  private updateIsShared(folder: Folder, isShared: boolean) {
    folder.isShared = isShared;
    if (folder.children && folder.children.length > 0) {
      folder.children.forEach((f: Folder) => this.updateIsShared(f, isShared));
    }
  }

  showDeleteFolder(folder: Folder, isShared: boolean) {
    this.genericConfirm.show({
      headlineText: 'Delete folder?',
      text: 'With all documents and sub-folders',
      hideNoButton: false,
      confirmText: 'Yes, delete it',
      callback: this.deleteFolder.bind(this, folder),
    });
  }

  deleteFolder(folder: Folder) {
    this.foldersService.remove(folder._id).subscribe(() => {
      this.selectedContextFolder = null;
      this.selectedFolder = null;
      folder.deleted = true;
      if (folder.parentRef) {
        const i = folder.parentRef.children.findIndex((f: Folder) => f._id === folder._id);
        if (i > -1) {
          folder.parentRef.children.splice(i, 1);
        }
      }
      const index = this.folders.findIndex((f: Folder) => f._id === folder._id);
      if (index > -1) {
        this.folders.splice(index, 1);
      }
      const indexInline = this.inlineFolders.findIndex((f: Folder) => f._id === folder._id);
      if (indexInline > -1) {
        this.inlineFolders.splice(index, 1);
      }
      this.toastr.success('Deleted');
    }, (err: any) => {
      this.toastr.error(err);
    });
  }

}
