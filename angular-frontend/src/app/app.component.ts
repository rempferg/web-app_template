import { Component, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTable, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';


@Component({
  standalone: true,
  selector: 'rest-component',
  imports: [ MatButtonModule, MatTooltipModule, MatCardModule, MatTableModule, MatPaginatorModule ],
  template: `
    <button mat-raised-button matTooltip="Fetches messages from a PostgreSQL database through a FastAPI REST backend" (click)="addResponse()">REST request</button><br><br>
    @if (responses.length > 0) {
      <table #myTable mat-table [dataSource]="responses">
        <ng-container matColumnDef="id">
          <th mat-header-cell *matHeaderCellDef mat-sort-header> ID </th>
          <td mat-cell *matCellDef="let element"> {{element["id"]}} </td>
        </ng-container>

        <ng-container matColumnDef="firstname">
          <th mat-header-cell *matHeaderCellDef mat-sort-header> Name </th>
          <td mat-cell *matCellDef="let element"> {{element["firstname"]}} </td>
        </ng-container>

        <ng-container matColumnDef="message">
          <th mat-header-cell *matHeaderCellDef mat-sort-header> Message </th>
          <td mat-cell *matCellDef="let element"> {{element["message"]}} </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columnsToDisplay"></tr>
        <tr mat-row *matRowDef="let myRowData; columns: columnsToDisplay"></tr>
      </table>
      <!-- <mat-paginator [pageSizeOptions]="[5, 10, 20]" [length]="responses.length"
        showFirstLastButtons
        aria-label="Select page of messages">
      </mat-paginator> -->
    }
  `
})
export class RestComponent {
  columnsToDisplay = ['id', 'firstname', 'message'];
  responses = [];
  @ViewChild(MatTable) myTable!: MatTable<any>;

  constructor(private http : HttpClient) {}
  
  addResponse() {
    this.http.get<any>("http://localhost:8000/api/").subscribe(data => this.responses = this.responses.concat(data));
    this.myTable.renderRows();
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
