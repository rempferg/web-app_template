import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';


@Component({
  standalone: true,
  selector: 'rest-component',
  imports: [ MatButtonModule, MatTooltipModule, MatTableModule, MatPaginatorModule, MatSortModule, MatIconModule, MatExpansionModule, MatInputModule, MatFormFieldModule ],
  template: `
    <mat-expansion-panel hideToggle>
      <mat-expansion-panel-header>
        <mat-panel-title><mat-icon>add</mat-icon></mat-panel-title>
        <mat-panel-description> Add an entry </mat-panel-description>
      </mat-expansion-panel-header>
      <mat-form-field style="width:49%">
        <mat-label>First name</mat-label>
        <input matInput #firstname>
      </mat-form-field>
      <mat-form-field style="width:49%; margin-left:2%">
        <mat-label>Last name</mat-label>
        <input matInput #lastname>
      </mat-form-field>
      <br>
      <mat-form-field style="width:100%">
        <mat-label>Message</mat-label>
        <textarea matInput #message></textarea>
      </mat-form-field>
      <button mat-button matTooltip="Fetches messages from a PostgreSQL database through a FastAPI REST backend" (click)="addEntry(firstname.value, lastname.value, message.value)">save</button>
    </mat-expansion-panel>
    <table #myTable mat-table [dataSource]="dataSource" matSort>
      @for (column of columnsToDisplay; track column) {
        @if (column != 'Operations') {
          <ng-container matColumnDef="{{column}}">
            <th mat-header-cell *matHeaderCellDef mat-sort-header> {{column}} </th>
            <td mat-cell *matCellDef="let element"> {{element[column]}} </td>
          </ng-container>
        }
      }
      <ng-container matColumnDef="Operations">
        <th mat-header-cell *matHeaderCellDef mat-sort-header>  </th>
        <td mat-cell *matCellDef="let element">
          <button mat-icon-button aria-label="delete">
            <mat-icon (click)="deleteRow(element['ID'])">delete</mat-icon>
          </button>
        </td>
      </ng-container>
      <tr mat-header-row *matHeaderRowDef="columnsToDisplay"></tr>
      <tr mat-row *matRowDef="let myRowData; columns: columnsToDisplay"></tr>
    </table>
    <mat-paginator [pageSizeOptions]="[5, 10, 20]"
      showFirstLastButtons
      aria-label="Select page of messages">
    </mat-paginator>
  `
})
export class RestComponent implements AfterViewInit {
  columnsToDisplay = ['ID', 'Name', 'Message', 'Operations'];
  dataSource = new MatTableDataSource();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private http : HttpClient) {}

  apiURI = "api/";
    
  loadList() {
    this.http.get<any>(this.apiURI).subscribe(data => {
      this.dataSource.data = this.dataSource.data.concat(data)
    });
  }

  deleteRow( id: number ) {
    console.log("deleting ID " + id);
  }

  addEntry( firstname: string, lastname: string, message: string ) {
    console.log("adding " + firstname + " " + lastname + " " + message);
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    if(window.location.hostname == "localhost" || window.location.hostname == "127.0.0.1" || window.location.hostname == "0.0.0.0")
      this.apiURI = "http://localhost:8000/api/";
    this.loadList();
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
