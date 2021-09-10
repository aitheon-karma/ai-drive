import { Component, OnInit, ViewChild, Output, Input, EventEmitter } from '@angular/core';
import { ModalDirective } from 'ngx-bootstrap/modal';

export interface ModalData {
  text: string,
  hideNoButton?: boolean,
  confirmText?: string,
  headlineText?: string,
  callback?: any
}
@Component({
  selector: 'fl-generic-confirm',
  templateUrl: './generic-confirm.component.html',
  styleUrls: ['./generic-confirm.component.scss']
})
export class GenericConfirmComponent implements OnInit {

  @ViewChild('formModal') formModal: ModalDirective;
  @Input() showCancel: boolean = true;

  data: ModalData = {} as ModalData;

  constructor( ) { }

  ngOnInit() { }

  hide() {
    this.formModal.hide();
  }

  onConfirm() {
    this.hide();
    if (this.data.callback) {
      this.data.callback();
    }
  }

  show(data: ModalData) {
    this.data = data;
    this.formModal.show();
  }

  cancel() {
    this.formModal.hide();
  }

}
