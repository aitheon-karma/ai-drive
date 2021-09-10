import { Component, OnInit, ViewChild, AfterViewInit, Output, EventEmitter } from '@angular/core';
import { SignaturePad } from 'angular2-signaturepad/signature-pad';
import { Signature } from '../shared';
import { FileUploader, FileItem } from 'ng2-file-upload';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'fl-signature-creator',
  templateUrl: './signature-creator.component.html',
  styleUrls: ['./signature-creator.component.scss']
})
export class SignatureCreatorComponent implements OnInit, AfterViewInit {


  @ViewChild(SignaturePad) signaturePad: SignaturePad;
  @Output() back: EventEmitter<void> = new EventEmitter<void>();
  @Output() saved: EventEmitter<Signature> = new EventEmitter<Signature>();
  uploader: FileUploader;
  base64Sign: string;
  isUploading = false;

  signaturePadOptions: Object = { // passed through to szimek/signature_pad constructor
    'minWidth': 0.5,
    'canvasWidth': 500,
    'canvasHeight': 250
  };
  hideHint = false;

  constructor(
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.uploader = this.initUploader();
  }

  initUploader(): FileUploader {

    this.uploader = new FileUploader({
      url: '/drive/api/signatures',
      method: 'POST',
      // authToken: 'JWT ' + this.authToken,
      autoUpload: false,
      removeAfterUpload: true
    });

    /**
     * Events
     */
    this.uploader.onSuccessItem = (fileItem: FileItem, response: any) => {
     this.isUploading = false;
     this.saved.emit(JSON.parse(response));
     this.base64Sign = undefined;
     this.onClear();
    }

    this.uploader.onErrorItem = (fileItem: FileItem, response: any, status: any) => {
      try {
        response = JSON.parse(response);
        response = response.message;
        this.toastr.error(response);
      } catch (err) { }
      fileItem.remove();
    };

    return this.uploader;
  }

  ngAfterViewInit() {
    // this.signaturePad is now available
    this.signaturePad.set('minWidth', 0.5); // set szimek/signature_pad options at runtime
    this.signaturePad.clear(); // invoke functions from szimek/signature_pad API
  }

  drawComplete() {
    // will be notified of szimek/signature_pad's onEnd event
    // this.base64Sign = this.signaturePad.toDataURL();
  }

  drawStart() {
    this.hideHint = true;
  }

  onClear() {
    this.signaturePad.clear();
    this.hideHint = false;
  }

  onBack(){
    this.back.emit();
  }

  dataURLtoFile(dataurl, filename) {
    var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
  }

  save(){
    // this.saved.emit();
    this.isUploading = true;
    this.base64Sign = this.signaturePad.toDataURL();
    const file = this.dataURLtoFile(this.base64Sign, 'signature.png');
    this.uploader.addToQueue([file]);
    this.uploader.uploadAll();
  }


}
