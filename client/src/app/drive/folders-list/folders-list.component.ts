import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Folder, FoldersService } from '../shared';
import { ContextMenuComponent } from 'ngx-contextmenu';
import { ShareService } from '../shared/share.service';

@Component({
  selector: 'ai-folders-list',
  templateUrl: './folders-list.component.html',
  styleUrls: ['./folders-list.component.scss']
})
export class FoldersListComponent implements OnInit {

  @Input() inline: boolean;
  @Input() currentUser: any;
  @Input() folders: Folder[];
  @Input() isShareView: boolean;
  @Input() foldersMenu: ContextMenuComponent;

  @Input() selectedFolder: Folder;
  @Input() selectedContextFolder: Folder;

  @Input() parent: Folder;
  @Output() folderSelected: EventEmitter<{ folder: Folder, breadcrumbs: Folder[], isShareView: boolean, inline: boolean }> = new EventEmitter<{ folder: Folder, breadcrumbs: Folder[], isShareView: boolean, inline: boolean }>();
  @Output() folderChildrenLoaded: EventEmitter<{ folders: Folder[] }> = new EventEmitter<{ folders: Folder[] }>();
  @Output() folderOpened: EventEmitter<{ folder: Folder, inline: boolean }> = new EventEmitter<{ folder: Folder, inline: boolean }>();

  inlineSelected: Folder;

  constructor(
    private foldersService: FoldersService,
    private shareService: ShareService
  ) { }

  ngOnInit() {
    // console.log(this.foldersMenu);
  }

  toggleFolder(folder: Folder, onlyExpand: boolean, event: MouseEvent){
    if (this.inline){
      this.folderOpened.emit({ folder: folder, inline: this.inline });
      this.selectFolder({ folder: folder, breadcrumbs: [folder], isShareView: this.isShareView, inline: this.inline });
    } else {
      folder.opened = !folder.opened;
      if (folder.opened){
        this.loadFolders(folder, onlyExpand);
      }
    }
    event.stopPropagation();
  }

  selectFolder(event: { folder: Folder, breadcrumbs: Folder[], isShareView: boolean, inline: boolean }){
    if (this.parent){
      if (!event.breadcrumbs){
        event.breadcrumbs = [event.folder];
      } else {
        event.breadcrumbs.unshift(this.parent);
      }
    } else {
      event.breadcrumbs = [event.folder];
    }
    event.isShareView = this.isShareView;
    event.inline = this.inline;
    event.folder.inlineSelected = this.inline;
    this.folderSelected.emit(event);
    // if (!this.inline){
    //   this.loadFolders(event.folder, false);
    // }
    this.inlineSelected = null;
    this.loadFolders(event.folder, false);
  }

  inlineSelectFolder(event: { folder: Folder, breadcrumbs: Folder[], isShareView: boolean, inline: boolean }){
    this.inlineSelected = event.folder;
  }

  loadFolders(folder: Folder, onlyExpand: boolean){
    folder.isLoading = true;
    const action = this.isShareView ? this.shareService.listFolders(folder._id) : this.foldersService.list(null, folder._id);
    action.subscribe((folders: Folder[]) => {
      folder.children = folders.map((f: Folder) => {
        f.isSharedView = this.isShareView;
        return f;
      });
      if (!onlyExpand){
        this.folderChildrenLoaded.emit({ folders: folder.children.slice(0) });
      }
      folder.isLoading = false;
    });
  }

  onSelectFolderHandler(event: { folder: Folder, breadcrumbs: Folder[], isShareView: boolean, inline: boolean }){
    if (this.parent){
      if (!event.breadcrumbs){
        event.breadcrumbs = [event.folder];
      } else {
        event.breadcrumbs.unshift(this.parent);
      }
    }
    event.folder.inlineSelected = event.inline;
    event.isShareView = this.isShareView;
    event.inline = this.inline;
    this.inlineSelected = null;
    this.folderSelected.emit(event);
  }

  onFolderChildrenLoadedHandler(event: any){
    console.log('onFolderChildrenLoadedHandler going UP');
    this.folderChildrenLoaded.emit(event);
  }

  onFolderOpenedHandler(event: any){
    this.folderOpened.emit(event);
  }

  isSharedFolder = (item: any): boolean =>  {
    console.log('item.isShared', item.isShared);
    return item.isShared;
  }

}
