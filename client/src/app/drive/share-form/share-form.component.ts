import { Component, OnInit, ViewChild, Output, Input, EventEmitter } from '@angular/core';
import { ModalDirective } from 'ngx-bootstrap/modal';
import { Document, DocumentsService, Folder } from '../shared';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs/Observable';
import { ShareService } from '../shared/share.service';
import { Share } from '../shared/share';
import { CompleterCmp, CompleterData, CompleterService, CompleterItem, RemoteData, RemoteDataFactory } from 'ng2-completer';
import { AuthService } from '@aitheon/core-client';
import { CustomData } from './custom-completer';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'fl-share-form',
  templateUrl: './share-form.component.html',
  styleUrls: ['./share-form.component.scss']
})
export class ShareFormComponent implements OnInit {

  @ViewChild('formModal') formModal: ModalDirective;
  @ViewChild("shareSearch") shareSearch: CompleterCmp;
  @Output() saved: EventEmitter<{ isShared: boolean, shareItem: Document | Folder; shareType: string }>
          = new EventEmitter<{ isShared: boolean, shareItem: Document | Folder; shareType: string }>();

  submitted = false;
  submitting = false;
  error: any;
  isCopied =  false;
  shareType: string;
  shareItem: Document | Folder;

  shareList = [];

  emailRegex = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
  shareableLink: string;
  shareableLinkEnabled: boolean;
  emailInvalid = false;
  isLoading = false;
  dataRemote: CompleterData;
  showSearch = false;
  showUserName = false;
  userEmail: string;
  remoteData: RemoteData;
  organization: any;
  shareListStart: any[] = [];
  isShareDisable = true;

  constructor(
    private fb: FormBuilder,
    private shareService: ShareService,
    private toastr: ToastrService,
    private authService: AuthService,
    private completerService: CompleterService,
    private remoteDataFactory: RemoteDataFactory,
    private http: HttpClient
  ) {
    // this.remoteData = this.remoteDataFactory.create();
    // const originalConvert = this.remoteData.convertToItem;
    // this.remoteData.convertToItem = (data: any): CompleterItem | null => {
    //   return originalConvert(data);
    // }
    // this.remoteData
    //     .remoteUrl('/users/api/search?q=')
    //     .searchFields('name')
    //     .titleField('name');
    this.dataRemote = new CustomData(http);
  }



  ngOnInit() {
   this.authService.activeOrganization.subscribe((org: any) => {
     this.organization = org;
    if (org){
      this.showSearch = true;
      this.showUserName = true;
    }
   });
  }

  hide(){
    this.formModal.hide();
  }

  show(shareType: string, shareItem: Document | Folder){
    this.shareItem = shareItem;
    this.shareType = shareType;
    this.isLoading = true;
    this.shareService.listByItem(shareItem._id, shareType).subscribe((shares: Share[]) => {
      const shareableLinkIndex = shares.findIndex((s: Share) => s.sharedTo.shareableLink);
      this.shareableLinkEnabled = shareableLinkIndex > -1;
      if (this.shareableLinkEnabled){
        shares.splice(shareableLinkIndex, 1);
      }
      this.shareList = shares.map((s: Share) => {
        if (s.sharedTo.user){
          if (!s.sharedTo.user.profile.avatarUrl){
            s.sharedTo.user.profile.avatarUrl = '/drive/assets/img/nophoto.png';
          }
          return Object.assign({ initial: true }, s.sharedTo.user, { organization: s.sharedTo.organization });
        }else if (s.sharedTo.team){
          return Object.assign({ initial: true, isTeam: true }, s.sharedTo.team, { organization: s.sharedTo.organization });
        } else if (s.sharedTo.email){
          return { email: s.sharedTo.email, initial: true };
        }
      });
      this.shareListStart = [...this.shareList];
      this.compareArrs();
      this.isLoading = false;
    }, (err: any) => {
      this.isLoading = false;
      this.toastr.error(err);
    })
    this.shareableLink = `${ window.location.origin }/drive/shared/${ shareType }/${ this.shareItem._id }`;
    this.formModal.show();
  }


  cancel(){
    this.formModal.hide();
  }

  public requestAutocompleteItems = (text: string): Observable<Array<any>> => {
    return this.shareService.searchUsers(text);
  };

  onSubmit() {
    // fix on blur fire from dropdown
    this.submitted = true;
    this.error = null;
    if (this.emailInvalid){
      return;
    }
    const sharedTo = this.shareList.map((s: any) => {
      return {
        user: s._id && !s.isTeam? s._id : undefined,
        team: s._id && s.isTeam ? s._id : undefined,
        email: !s._id ? s.email : undefined,
        organization: s.organization || undefined
      }
    });

    if (this.shareableLinkEnabled){
      sharedTo.push({
        shareableLink: true
      } as any);
    }

    this.submitting = true;
    this.shareService.save(this.shareItem._id, this.shareType, sharedTo).subscribe((result: { isShared: boolean }) => {
      this.formModal.hide();
      this.submitted = false;

      this.saved.emit({ isShared: result.isShared, shareItem: this.shareItem, shareType: this.shareType });

      this.toastr.success('Saved');
      this.submitting = false;
    }, (err) => {
      this.submitted = false;
      this.submitting = false;
      this.toastr.error(err);
    });
  }

  onAdd(item: any){
    this.validateEmails();
  }

  onRemove(item: any) {
    this.validateEmails();
  }

  validateEmails(){
    this.emailInvalid = this.shareList.filter((s: any) => {
      if (!s._id){
        return !this.emailRegex.test(s.email);
      } else {
        return false;
      }
    }).length > 0;
  }


  public matchingFn = (text: string, value: any): boolean => {
    return true;
  };

  copyOnSuccess(){
    this.isCopied = true;
    setTimeout(() => {
      this.isCopied = false;
    }, 1000);
  }

  onShareableLinkChanged(){
    this.shareableLinkEnabled = !this.shareableLinkEnabled;
  }

  removeItem(item: any, index: number){
    this.shareList.splice(index, 1);
    this.compareArrs()
    this.toastr.success('User was removed');
  }

  onUserSelected(selected: CompleterItem) {
    if (selected){
      const index = this.shareList.findIndex((s: any) => { return s._id === selected.originalObject._id; });
      if (index === -1){
        selected.originalObject.organization = this.organization ? this.organization._id : '';
        this.shareList.push(selected.originalObject)
      }
    }
    this.compareArrs()
  }

  onSearchKeydown(event: any){
    // this.emailInvalid = false;
    // if (event.keyCode === 13){
    //   const email = this.shareSearch.value;
    //   if (!this.emailRegex.test(email)){
    //     this.emailInvalid = true;
    //     return;
    //   }
    //   const index = this.shareList.findIndex((s: any) => { return s.email.toLowerCase() === email.toLowerCase(); });
    //   if (index === -1){
    //     this.shareList.push({ email: email, organization: '' });
    //     this.shareSearch.writeValue('');
    //     this.shareSearch.blur();
    //     this.shareSearch.open();
    //   }
    // }
  }

  onUserEnterKeydown(event: KeyboardEvent) {
    // console.log(event);
    this.emailInvalid = false;
    const codes = [13, 188, 32];
    if (codes.includes(event.keyCode)){
      const email = this.userEmail;
      if (!this.emailRegex.test(email)){
        this.emailInvalid = true;
        return;
      }
      this.userEmail = '';
      const index = this.shareList.findIndex((s: any) => { return s.email.toLowerCase() === email.toLowerCase(); });
      if (index === -1){
        this.shareList.push({ email: email, organization: '' });
      }
      event.preventDefault();
    }
  }

  compareArrs() {
    this.isShareDisable = JSON.stringify(this.shareList) === JSON.stringify(this.shareListStart);
  }
}
