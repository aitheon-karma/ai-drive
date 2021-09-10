import { Component, OnInit, ViewChild, Output, Input, EventEmitter } from '@angular/core';
import { ModalDirective } from 'ngx-bootstrap/modal';
import { Document, DocumentsService } from '../shared';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'fl-document-form',
  templateUrl: './document-form.component.html',
  styleUrls: ['./document-form.component.scss']
})
export class DocumentFormComponent implements OnInit {

  @Output() saved: EventEmitter<Document> = new EventEmitter<Document>();
  @Output() canceled: EventEmitter<void> = new EventEmitter<void>();

  @ViewChild('formModal') formModal: ModalDirective;

  documentForm: FormGroup;
  submitted = false;
  error: any;

  document: Document;
  prevValue: string;

  constructor(
    private fb: FormBuilder,
    private documentsService: DocumentsService,
    private toastr: ToastrService
  ) { }

  ngOnInit() {
  }

  hide(){
    this.formModal.hide();
    this.canceled.emit();
  }

  show(document: Document){
    this.document = document;
    this.buildForm(document);
    this.formModal.show();
  }


  cancel(){
    this.formModal.hide();
    this.documentForm = null;
    this.canceled.emit();
  }

  buildForm(document: Document){
    this.prevValue = document.name;
    this.documentForm = this.fb.group({
      name: [document.name, [Validators.required]],
    });
  }

  onSubmit() {
    this.submitted = true;
    if (this.documentForm.invalid) {
      return;
    }
    const document = Object.assign({}, this.document, this.documentForm.value);

    this.error = null;
    this.documentsService.update(document).subscribe(() => {
      this.formModal.hide();
      this.submitted = false;
      this.documentForm = null;
      this.toastr.success('Document updated');
      this.saved.emit(document);
    }, (err) => {
      this.submitted = false;
      this.error = err;
    })
  }

}
