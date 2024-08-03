import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';


@Component({
  standalone: true,
  selector: 'rest-component',
  imports: [ MatButtonModule, MatTooltipModule, MatCardModule ],
  template: `
    <button mat-raised-button matTooltip="Fetches messages from a PostgreSQL database through a FastAPI REST backend" (click)="addResponse()">REST request</button><br><br>
    @for (response of responses; track response) {
      <mat-card appearance="outlined">
        <mat-card-header>Message {{ response["id"] }}</mat-card-header>
        <mat-card-content>{{ response["message"] }}</mat-card-content>
      </mat-card>
    }
  `
})
export class RestComponent {
  responses = [];

  constructor(private http : HttpClient) {}
  
  addResponse() {
    this.http.get<any>("api/").subscribe(data => this.responses = this.responses.concat(data));
  }
}


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RestComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'angular-frontend';
}
