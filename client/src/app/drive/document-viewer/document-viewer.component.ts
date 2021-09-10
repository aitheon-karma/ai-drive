import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { BsModalService, ModalDirective } from 'ngx-bootstrap/modal';
import { BsModalRef } from 'ngx-bootstrap/modal/bs-modal-ref.service';
import { Document } from '../shared/document';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'fl-document-viewer',
  templateUrl: './document-viewer.component.html',
  styleUrls: ['./document-viewer.component.scss']
})
export class DocumentViewerComponent implements OnInit {



  @ViewChild('viewerModal') viewerModal: ModalDirective;
  document: Document;
  previewUrl: SafeResourceUrl;
  noViewSupport: Boolean;

  constructor(
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit() {
  }

  show(document: Document) {
    this.document = document;
    this.noViewSupport = !this.document.contentType.includes('image') && !this.document.contentType.includes('pdf');
    const url = environment.production ? `/drive/api/documents/${ document._id }` : `/api/documents/${ document._id }`;
    this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.viewerModal.show();
  }

  hide(){
    this.viewerModal.hide();
  }

}
