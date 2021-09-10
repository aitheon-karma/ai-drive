import { Component, OnInit, ViewChild, Output, EventEmitter } from '@angular/core';
import { ModalDirective } from 'ngx-bootstrap';
import { Document, DocumentControl, DocumentsService, SignaturesService, Signature } from '../shared';
import { DragImage } from 'ng2-dnd';
import { PdfViewerComponent } from '../pdf-viewer/pdf-viewer.component';
import { AuthService } from '@aitheon/core-client';
import { SignaturesComponent } from '../signatures/signatures.component';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'fl-documents-editor',
  templateUrl: './documents-editor.component.html',
  styleUrls: ['./documents-editor.component.scss']
})
export class DocumentsEditorComponent implements OnInit {

  @ViewChild('signaturesManager') signaturesManager: SignaturesComponent;
  @ViewChild('documentEditModal') public documentEditModal: ModalDirective;
  @ViewChild('pdfViewer') public pdfViewer: PdfViewerComponent
  @Output() documentCreated: EventEmitter<Document> = new EventEmitter<Document>();

  // url = '/hr/api/documents/5a2aa4e0f9a5658e0c6501c8/preview?fl_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1YTFjNTI3Y2EyNTlkNjAwMTYzMmM4NmYiLCJwcm9maWxlIjp7ImZpcnN0TmFtZSI6IlNlcmdlaSIsImxhc3ROYW1lIjoiU2xlcHRzb3YifSwiZW1haWwiOiJzZXJnZWkuc2xlcHRzb3ZAZ21haWwuY29tIiwiaWF0IjoxNTEyNTc2MjYzLCJleHAiOjExNzMyOTA0NTc2MjYzfQ.yWJ8roC83X2xBytom7zucXdZsSwwMCLGkYTIELGXaGw';
  url: string;

  documentControls: DocumentControl[] = [];
  document: Document;
  myDragImage: DragImage;
  authToken: String;
  secondModalOpen = false;

  signatures: Signature[];
  isLoagingSignatures = false;
  signing = false;

  get pageControls(): DocumentControl[]  {
    if (!this.pdfViewer){
      return [];
    }
    return this.documentControls.filter((dc: DocumentControl) => dc.pageNumber === this.pdfViewer.pageNumber);
  }

  constructor(
    private documentsService: DocumentsService,
    private authService: AuthService,
    private signaturesService: SignaturesService,
    private toastr: ToastrService,
  ) {
    let img = new Image();
    img.src = "/hr/assets/document-control.jpg";
    img.height = 14;
    img.width = 55;
    this.myDragImage = new DragImage(img, 0, 0);
    this.authService.token.subscribe((token: string) => {
      this.authToken = token;
    });


  }

  ngOnInit() {
    this.loadSignatures();
  }

  loadSignatures(){
    this.signaturesService.list().subscribe((signatures: Signature[]) => {
      this.signatures = signatures.map((s: Signature) => {
        s.url = this.getSignatureUrl(s);
        return s;
      });
      this.isLoagingSignatures = false;
    }, (err: any) => {
      this.toastr.error(err);
      this.isLoagingSignatures = false;
    })
  }

  getSignatureUrl(signature: Signature){
    return `/drive/api/signatures/${ signature._id }`;
  }

  onSignaturesManagerClosed(signatures: Signature[]){
    this.secondModalOpen = false;
    this.signatures = signatures;
  }

  onSignatureSelected(event: { signature: Signature }){
    this.secondModalOpen = false;
    const control = new DocumentControl();
    control.type = 'SIGNATURE',
    control.position = {
      x: 64,
      y: 64,
    };
    control.signature = event.signature._id;
    control.document = this.document._id;
    control.pageNumber = this.pdfViewer.pageNumber;
    control.isNew = true;
    this.documentsService.saveDocumentControl(control).subscribe((c: DocumentControl) => {
      control._id = c._id;
      this.documentControls.push(control);
    }, (err: any) => this.toastr.error(err));
  }

  showSigns(){
    this.secondModalOpen = true;
    this.signaturesManager.show();
  }

  pdfLoaded(){
    this.documentsService.listDocumentControl(this.document._id).subscribe((dc: DocumentControl[]) => {
      this.documentControls = dc;
    }, (err: any) => this.toastr.error(err));
  }

  public show(document: Document){
    this.document = document;
    this.url = environment.production ? `/drive/api/documents/${ document._id }` : `/api/documents/${ document._id }`;
    this.documentEditModal.show();
  }

  onDragStart($event: any){
  }

  onDragEnd(event: any){
    console.log('onDragEnd!!!!!!!', event);
    if (event.dragData){
      const control = new DocumentControl();
      control.type = event.dragData.type,
      control.position = {
        x: event.mouseEvent.x,
        y: event.mouseEvent.y,
      };
      control.signature = event.dragData.signature;
      control.document = this.document._id;
      control.pageNumber = this.pdfViewer.pageNumber;
      control.isNew = true;
      this.documentsService.saveDocumentControl(control).subscribe((c: DocumentControl) => {
        control._id = c._id;
        this.documentControls.push(control);
      });
    }
  }

  onEditHidden() {
    this.url = null;
    this.document = null;
    this.documentControls = [];
  }

  positionChanged(control: DocumentControl, event: { x: number, y: number }){
    control.position = event;
    this.documentsService.saveDocumentControl(control).subscribe((c: DocumentControl) => {
      console.log('positionChanged success');
    });
  }

  removeControl(documentControl: DocumentControl){
    this.documentsService.removeDocumentControl(documentControl).subscribe(() => {
      const index = this.documentControls.indexOf(documentControl);
      this.documentControls.splice(index, 1);
      console.log('removeDocumentControl success');
    }, (err: any) => {
      this.toastr.error(err)
    });
  }

  finish(){
    this.signing = true;
    this.documentsService.sign(this.document).subscribe((document: Document) => {
      this.documentCreated.emit(document);
      this.signing = false;
      this.documentEditModal.hide();
    }, (err: any) => {
      this.signing = false;
      this.toastr.error(err)
    });
  }

  hide(){
    this.documentEditModal.hide();
  }
}
