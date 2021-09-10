import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { DocumentViewerComponent } from '../document-viewer/document-viewer.component';
import { Document, DocumentsService } from '../shared';
import { DocumentFormComponent } from '../document-form/document-form.component';
import { SwalComponent } from '@toverux/ngx-sweetalert2';
import { ToastrService } from 'ngx-toastr';
import { ShareFormComponent } from '../share-form/share-form.component';
import { DocumentsEditorComponent } from '../documents-editor/documents-editor.component';
import { GenericConfirmComponent } from '../../shared/generic-confirm/generic-confirm.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'ai-documents-list',
  templateUrl: './documents-list.component.html',
  styleUrls: ['./documents-list.component.scss']
})
export class DocumentsListComponent implements OnInit {

  @Input() documents: Document[];
  @Input() currentUser: any;
  @Input() disableEdit = false;
  @Input() disableShare = false;
  @Input() shareForm: ShareFormComponent;

  @ViewChild('documentViewer') documentViewer: DocumentViewerComponent;
  @ViewChild('documentForm') documentForm: DocumentFormComponent;
  @ViewChild('deleteModal') deleteModal: SwalComponent;
  @ViewChild('documentsEditor') documentsEditor: DocumentsEditorComponent;
  @ViewChild('genericConfirm') genericConfirm: GenericConfirmComponent;

  deleteDocument: Document;
  contextMenuDocument: Document;
  deleteOptions = {
    title: 'Confirm delete?',
    text: 'This cannot be undone.',
    type: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, delete it',
  };

  constructor(
    private documentsService: DocumentsService,
    private toastr: ToastrService
  ) { }

  ngOnInit() {
  }

  openDocument(document: Document) {
    if (document.deleting) {
      return;
    }
    this.documentViewer.show(document);
  }

  showRename(document: Document) {
    this.documentForm.show(document);
  }

  download(document: Document) {
    const url = environment.production
      ? `/drive/api/documents/${document._id}?download=true`
      : `/api/documents/${document._id}?download=true`;
    window.open(url, '_blank');
  }

  onDocumentSaved(document: Document) {
    const index = this.documents.findIndex((i: Document) => i._id === document._id);
    if (index > -1) {
      this.documents[index] = Object.assign(this.documents[index], document);
    }
  }

  onDocumentCreated(document: Document) {
    this.documents.push(document);
  }

  showDelete(document: Document) {
    this.deleteDocument = document;
    this.genericConfirm.show({
      headlineText: 'Confirm delete?',
      text: 'This cannot be undone.',
      hideNoButton: false,
      confirmText: 'Yes, delete it',
      callback: this.confirmDelete.bind(this),
    });
  }

  confirmDelete() {
    this.deleteDocument.deleting = true;
    this.documentsService.remove(this.deleteDocument._id).subscribe(() => {
      const index = this.documents.findIndex((i: Document) => i._id === this.deleteDocument._id);
      if (index > -1) {
        this.documents.splice(index, 1);
      }
      this.toastr.success('The file has been successfully deleted');
    }, (err: any) => {
      this.deleteDocument.deleting = false;
      this.toastr.error(err);
    });
  }

  showShare(document: Document) {
    this.shareForm.show('document', document);
  }

  onDeleteCancel() {
    this.deleteDocument = null;
  }

  onDocumentContextMenu(document: Document) {
    this.contextMenuDocument = document;
  }

  onDocumentContextClose() {
    this.contextMenuDocument = null;
  }

  isEditablePdf(document: Document): boolean {
    return document.contentType === 'application/pdf';
  }

  showSign(document: Document) {
    // this.signaturesManager.show();
    this.documentsEditor.show(document);
  }
}
