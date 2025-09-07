import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SideComponent } from '../side/side.component';

@Component({
  standalone: true,
  selector: 'app-shell',
  imports: [RouterOutlet, SideComponent],
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.css']
})
export class ShellComponent {}
