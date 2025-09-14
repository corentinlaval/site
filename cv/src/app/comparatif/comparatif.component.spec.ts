import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComparatifComponent } from './comparatif.component';

describe('ComparatifComponent', () => {
  let component: ComparatifComponent;
  let fixture: ComponentFixture<ComparatifComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComparatifComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComparatifComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
