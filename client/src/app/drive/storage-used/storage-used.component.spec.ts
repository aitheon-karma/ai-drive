import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { StorageUsedComponent } from './storage-used.component';

describe('StorageUsedComponent', () => {
  let component: StorageUsedComponent;
  let fixture: ComponentFixture<StorageUsedComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ StorageUsedComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StorageUsedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
