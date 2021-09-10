import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DriveRoutingModule } from './drive-routing.module';
import { FoldersListComponent } from './folders-list/folders-list.component';
import { DocumentsListComponent } from './documents-list/documents-list.component';
import { DriveComponent } from './drive.component';
import { SharedModule } from '../shared/shared.module';
import { FoldersService, DocumentsService, SignaturesService } from './shared';
import { DriveUploaderComponent } from './drive-uploader/drive-uploader.component';
import { DriveUploaderService } from './drive-uploader/drive-uploader.service';
import { DriveUploaderDirective } from './drive-uploader/drive-uploader.directive';
import { FileUploadModule } from 'ng2-file-upload';
import { ContextMenuModule } from 'ngx-contextmenu';
import { ModalModule } from 'ngx-bootstrap/modal';
import { FolderFormComponent } from './folder-form/folder-form.component';
import { ServicesListComponent } from './services-list/services-list.component';
import { DocumentViewerComponent } from './document-viewer/document-viewer.component';
import { DocumentFormComponent } from './document-form/document-form.component';
import { SweetAlert2Module } from '@toverux/ngx-sweetalert2';
import { ShareFormComponent } from './share-form/share-form.component';
import { TagInputModule } from 'ngx-chips';
import { ClipboardModule } from 'ngx-clipboard';
import { ShareService } from './shared/share.service';
import { StorageUsedComponent } from './storage-used/storage-used.component';
import { UsersSettingsService } from './shared/user-settings.service';
import { ProgressbarModule } from 'ngx-bootstrap/progressbar';
import { TooltipModule } from 'ngx-bootstrap/tooltip';
import { Ng2CompleterModule } from "ng2-completer";
import { SignaturesComponent } from './signatures/signatures.component';
import { SignaturePadModule } from 'angular2-signaturepad';
import { SignatureCreatorComponent } from './signature-creator/signature-creator.component';
import { DocumentsEditorComponent } from './documents-editor/documents-editor.component';
import { PdfViewerComponent } from './pdf-viewer/pdf-viewer.component';
import { DndModule } from 'ng2-dnd';
import { NgDraggableDirective } from './shared/ng-draggable.directive';
import { DocumentIconDirective } from './documents-list/document-icon.directive';
import { CoreClientModule } from '@aitheon/core-client';

@NgModule({
  imports: [
    CoreClientModule,
    SharedModule,
    DriveRoutingModule,
    FileUploadModule,
    ModalModule,
    ProgressbarModule,
    ContextMenuModule.forRoot({
      useBootstrap4: true,
      autoFocus: true
    }),
    TagInputModule,
    SweetAlert2Module,
    ClipboardModule,
    TooltipModule,
    Ng2CompleterModule,
    SignaturePadModule,
    DndModule
  ],
  declarations: [
    FoldersListComponent,
    DocumentsListComponent,
    DriveUploaderComponent,
    DriveUploaderDirective,
    DriveComponent,
    FolderFormComponent,
    ServicesListComponent,
    DocumentViewerComponent,
    DocumentFormComponent,
    ShareFormComponent,
    StorageUsedComponent,
    SignaturesComponent,
    SignatureCreatorComponent,
    DocumentsEditorComponent,
    PdfViewerComponent,
    NgDraggableDirective,
    DocumentIconDirective
  ],
  providers: [
    FoldersService,
    DocumentsService,
    DriveUploaderService,
    ShareService,
    UsersSettingsService,
    SignaturesService
  ]
})
export class DriveModule { }
