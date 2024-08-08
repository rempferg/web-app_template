import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';


@Component({
  standalone: true,
  selector: 'rest-component',
  imports: [ MatButtonModule, MatTooltipModule, MatTableModule, MatPaginatorModule, MatSortModule ],
  template: `
    <button mat-raised-button matTooltip="Fetches messages from a PostgreSQL database through a FastAPI REST backend" (click)="addResponse()">REST request</button>
    <br><br>
    <table #myTable mat-table [dataSource]="dataSource" matSort>
      @for (column of columnsToDisplay; track column) {
        <ng-container matColumnDef="{{column}}">
          <th mat-header-cell *matHeaderCellDef mat-sort-header> {{column}} </th>
          <td mat-cell *matCellDef="let element"> {{element[column]}} </td>
        </ng-container>
        
      }
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
  columnsToDisplay = ['ID', 'Name', 'Message'];
  dataSource = new MatTableDataSource();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private http : HttpClient) {}
  
  addResponse() {
    this.http.get<any>("api/").subscribe(data => {
      this.dataSource.data = this.dataSource.data.concat(data)
    });
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
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
