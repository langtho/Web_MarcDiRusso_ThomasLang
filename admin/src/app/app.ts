import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, MatButtonModule, MatDividerModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  titre = "AudioSampler — gestion des pads";
}
