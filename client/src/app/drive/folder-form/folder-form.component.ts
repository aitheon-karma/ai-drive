import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Folder, FoldersService } from '../shared';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'fl-folder-form',
  templateUrl: './folder-form.component.html',
  styleUrls: ['./folder-form.component.scss']
})
export class FolderFormComponent implements OnInit {

  @Input() folder: Folder;
  @Output() saved: EventEmitter<{ folder: Folder, isNew: boolean }> = new EventEmitter<{ folder: Folder, isNew: boolean }>();
  @Output() canceled: EventEmitter<void> = new EventEmitter<void>();

  folderForm: FormGroup;
  submitted = false;
  error: any;

  constructor(
    private fb: FormBuilder,
    private foldersServise: FoldersService,
    private toastr: ToastrService
  ) {
  }

  ngOnInit() {
    if (!this.folder){
      this.folder = {
        name: ''
      } as Folder;
    }
    this.buildForm(this.folder);
  }


  cancel(){
    this.folderForm = null;
    this.canceled.emit();
  }

  buildForm(folder: Folder){
    this.folderForm = this.fb.group({
      name: [folder.name, [Validators.required]],
    });
  }

  onSubmit() {
    this.submitted = true;
    if (this.folderForm.invalid) {
      return;
    }
    const folder = Object.assign({}, this.folder, this.folderForm.value);
    delete folder.children;
    delete folder.parentRef;

    this.error = null;
    if (!folder._id){
      this.foldersServise.create(folder).subscribe((i: Folder) => {
        this.submitted = false;
        this.toastr.success('Folder saved');
        this.saved.emit({ folder: Object.assign(this.folder, i), isNew: true});
      }, (err) => {
        this.submitted = false;
        this.error = err;
      })
    } else {
      this.foldersServise.update(folder).subscribe(() => {
        this.submitted = false;
        this.folderForm = null;
        this.toastr.success('Folder updated');
        this.saved.emit({ folder: folder, isNew: false });
      }, (err) => {
        this.submitted = false;
        this.error = err;
      })
    }
  }

}
