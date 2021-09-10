import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentsEditorComponent } from './documents-editor.component';

describe('DocumentsEditorComponent', () => {
  let component: DocumentsEditorComponent;
  let fixture: ComponentFixture<DocumentsEditorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DocumentsEditorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DocumentsEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
