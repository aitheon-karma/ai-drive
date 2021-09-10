import { Component, OnInit, ViewChild, TemplateRef, EventEmitter, Output } from '@angular/core';
import { BsModalRef, BsModalService, ModalDirective } from 'ngx-bootstrap/modal';
import { ToastrService } from 'ngx-toastr';
import { SignaturesService, Signature } from '../shared';
import { FileUploader, FileItem } from 'ng2-file-upload';

@Component({
  selector: 'fl-signatures',
  templateUrl: './signatures.component.html',
  styleUrls: ['./signatures.component.scss']
})
export class SignaturesComponent implements OnInit {
  @ViewChild('signaturesModal') signaturesModal: ModalDirective;
  @Output() closed: EventEmitter<Signature[]> = new EventEmitter<Signature[]>();
  @Output() selected: EventEmitter<{ signature: any }> = new EventEmitter<{ signature: any }>();

  signatures: Signature[];
  isLoaging = false;
  state: string = 'SIGN_LIST';
  selectedSignature: Signature;
  uploader: FileUploader;
  isUploading = false;

  constructor(
    private toastr: ToastrService,
    private signaturesService: SignaturesService
  ) { }


  ngOnInit() {
   this.initUploader();
  }

  show(){
    this.isLoaging = true;
    this.signatures = [];
    this.signaturesModal.show();
    this.signaturesService.list().subscribe((signatures: Signature[]) => {
      this.signatures = signatures.map((s: Signature) => {
        s.url = this.getSignatureUrl(s);
        return s;
      });
      this.isLoaging = false;
    }, (err: any) => {
      this.toastr.error(err);
      this.isLoaging = false;
    })
  }

  getSignatureUrl(signature: Signature){
    return `/drive/api/signatures/${ signature._id }`;;
  }

  showPad(){
    this.state = 'SIGNATURE_CREATOR';
  }

  onSignCreatorBack(){
    this.state = 'SIGN_LIST';
  }

  hide(){
    this.signaturesModal.hide();
    this.selectedSignature = null;
    this.closed.emit(this.signatures);
  }

  onSignSaved(signature: Signature){
    signature.url = this.getSignatureUrl(signature);
    this.signatures.push(signature);
    this.state = 'SIGN_LIST';
    this.selectedSignature = signature;
  }

  select(signature: Signature){
    if (this.selectedSignature == signature){
      this.selectedSignature = null;
      return;
    }
    if (signature.deleting){
      return;
    }
    this.selectedSignature = signature;
  }

  remove(signature: Signature){
    signature.deleting = true;
    this.signaturesService.remove(signature._id).subscribe(() => {
      const index = this.signatures.findIndex((s: Signature) => s._id === signature._id);
      this.signatures.splice(index, 1);
      if (this.selectedSignature && this.selectedSignature._id === signature._id){
        this.selectedSignature = null;
      }
      this.toastr.success('Signature removed');
    }, (err: any) => {
      signature.deleting = false;
      this.toastr.error(err);
    })
  }

  initUploader(): FileUploader {

    this.uploader = new FileUploader({
      url: '/drive/api/signatures',
      method: 'POST',
      allowedMimeType: ['image/png'],
      // authToken: 'JWT ' + this.authToken,
      autoUpload: true,
      removeAfterUpload: true
    });

    /**
     * Events
     */
    this.uploader.onSuccessItem = (fileItem: FileItem, response: any) => {
     this.isUploading = false;
     this.onSignSaved(JSON.parse(response));
    }

    this.uploader.onWhenAddingFileFailed = (item: any, filter: any, options: any) => {
      if (filter.name === 'fileType') {
        this.toastr.error(`${item.name}. Only PNG file is allowed.`, 'Fail to add file');
      }
    };

    this.uploader.onErrorItem = (fileItem: FileItem, response: any, status: any) => {
      try {
        this.isUploading = true;
        response = JSON.parse(response);
        response = response.message;
        this.toastr.error(response);
      } catch (err) { }
      fileItem.remove();
    };

    this.uploader.onBeforeUploadItem = () => {
      this.isUploading = true;
    }

    return this.uploader;
  }

  continue(){
    this.signaturesModal.hide();
    this.selected.emit({ signature: this.selectedSignature });
    this.selectedSignature = null;

  }


}
