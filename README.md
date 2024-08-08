# Setup for a Web-Application based on Angular, FastAPI, PostgreSQL, and Ubuntu 24.04 Server

These instructions are self-contained and should be sufficient to reproduce the whole setup. The additional code for the `angular-frontend` and `fastapi-backend` only exist to save time.

Demo: https://new.project-g.de

## Ubuntu 24.04

Set up a server with stock Ubuntu 24.04 Server.

### Automatic Updates

`root@ubuntu:~# vim /etc/apt/apt.conf.d/50unattended-upgrades`

comment in

`"${distro_id}:${distro_codename}-updates";`

`Unattended-Upgrade::Remove-Unused-Kernel-Packages "true"`**;**

`Unattended-Upgrade::Remove-New-Unused-Dependencies "true";`

`Unattended-Upgrade::Remove-Unused-Dependencies "true";`

`Unattended-Upgrade::Automatic-Reboot "true";`

`Unattended-Upgrade::Automatic-Reboot-Time "02:38";`

`root@ubuntu:~# vim /etc/apt/apt.conf.d/20auto-upgrades`

add

`APT::Periodic::Download-Upgradeable-Packages "1";`

`APT::Periodic::AutocleanInterval "7";`

### SSH server

For remote access. This is an unsafe config allowing remote root access using a password. You should instead create a user account with sudo privileges, and allow only authentication with a key. Your hosters will probably set up something secure by default.

as root: `passwd`

Edit `/etc/ssh/sshd_config` (replace `myPort`):

`Port myPort`

`PermitRootLogin yes`

`PasswordAuthentication yes`

`AllowTcpForwarding yes`

`vim /etc/ssh/sshd_config.d/50-cloud-init.conf`

`PasswordAuthentication yes`

`vim /etc/ssh/sshd_config.d/cloudimg-settings.conf`

`PasswordAuthentication yes`

Reboot. `systemctl restart ssh` is insufficient because ssh is socket activated and Ubuntu does not change port on the fly.

### Crowdsec

Dynamically sets up firewall rules to ban IPs that are doing suspicious stuff for an amount of time. Crowdsec provides better IPv6 support than fail2ban, and preemtively bans IPs that have done suspicious stuff on other peoples servers.

```
apt install crowdsec
apt install crowdsec-firewall-bouncer
```

To see config:

```
cscli alerts list
cscli decisions list
nft list ruleset
```

to unban everyone (if you have locked yourself out):

`cscli decisions delete --all`

## Webserver

`apt install nginx`

Hello world page should be accessible.

create `/etc/nginx/sites-available/angular-test` and paste (replace `mySubdomain.myDomain.myTLD`):

```
server {
  listen 80;
  sendfile on;
  default_type application/octet-stream;
  
  server_name mySubdomain.myDomain.myTLD

  gzip on;
  gzip_http_version 1.1;
  gzip_disable      "MSIE [1-6]\.";
  gzip_min_length   256;
  gzip_vary         on;
  gzip_proxied      expired no-cache no-store private auth;
  gzip_types        text/plain text/css application/json application/javascript application/x-javascript text/xml application/xml application/xml+rss text/javascript;
  gzip_comp_level   9;

  location / {
    root /var/www/angular-test/;
    try_files $uri $uri/ /index.html;
  }
}
```

`cd /etc/nginx/sites-enabled/; rm default; ln -s ../sites-available/angular-test`
`systemd nginx reload`

## Certbot

For fully automatic HTTPS setup and certificate renewal through Letsencrypt.

`snap install --classic certbot`
`certbot --nginx`
`certbot renew --dry-run`
`systemctl list-timers`

check whether certbot renewal job is there (`snap.certbot.renew`)

## PostgreSQL

Postgres pretty much can do everything MySQL can do, but can directly output JSON, which is why we use it.

Postgres uses "roles" to manage access and expects a linux user, a postgres role, and a postgres database all with the same name.

`apt install postgresql postgresql-contrib`

`useradd fastapitest`

`sudo -u postgres psql`

`create user fastapitest with password 'myPassword';`

`create database fastapitest;`

`\c fastapitest`

`create table messages(id int, message varchar(255), person_id int);`

`grant all on messages to fastapitest;`

`create table messages(id int, message varchar(255), person_id int);`

`grant all on messages to fastapitest;`

`create table persons(id int, firstname varchar(255), lastname varchar(255));`

`grant all on persons to fastapitest;`

To delete a postgres user
`drop owned by fastapitest;` removed all privileges
`drop user fastapitest;` removes user (only succeeds if no privileges are associated)

## Deploy REST Backend

### Python FastAPI Implementation

`apt install python3-fastapi`
`apt install python3-psycopg2`

into `/var/www/fastapi-backend/fastapi_backend.py`

```
from fastapi import FastAPI
import psycopg2

conn = psycopg2.connect(database="fastapitest",
                        host="localhost",
                        user="fastapitest",
                        password="myPassword",
                        port="5432")

app = FastAPI()

subapi = FastAPI()
app.mount("/api", subapi)

@subapi.get("/")
async def root():
    cursor = conn.cursor()
    cursor.execute('''SELECT COALESCE(JSON_AGG(r), '[]'::json) FROM (SELECT messages.id as "ID", message as "Message", CONCAT(firstname, ' ', lastname) as "Name" FROM messages, persons where messages.id = persons.id) r''')
    result = cursor.fetchone()[0]
    print(result)
    return result


# this allows requests towards your API from frontend websites not served from the same host as this backend.
# access from non-browser clients is always possible.
# you want this when you run the front- and backend in separate webservers using different ports of your developer machine.
# if you want to turn this on in production, read up on CORS and the Cross-Site Request Forgery attacks it's meant to prevent.

from fastapi.middleware.cors import CORSMiddleware

origins = [
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

To test manually on server:
`mkdir -p /var/run/uvicorn`
`python3 -m uvicorn fastapi_backend:app --uds /var/run/uvicorn/fastapi-backend.sock --workers 4`

To run manually on developer machine:
`python3 -m uvicorn fastapi_backend:app --host 0.0.0.0 --port 8000 --reload`
The reload option restarts the script automatically when you edit it. Running it this way allows you to connect to the backend with a browser.

### Make backend available through webserver

Making the REST backend reachable through the same webserver as under the subdir /api.
Open `/etc/nginx/sites-available/angular-test` and add the `upstream api_backend` and `location /api` sections:

```
upstream api_backend {
    server unix:/var/run/uvicorn/fastapi-backend.sock fail_timeout=0;
}
server {
  sendfile on;
  default_type application/octet-stream;

  server_name mySubdomain.myDomain.myTLD

  gzip on;
  gzip_http_version 1.1;
  gzip_disable      "MSIE [1-6]\.";
  gzip_min_length   256;
  gzip_vary         on;
  gzip_proxied      expired no-cache no-store private auth;
  gzip_types        text/plain text/css application/json application/javascript application/x-javascript text/xml application/xml application/xml+rss text/javascript;
  gzip_comp_level   9;

  location /api {
    proxy_pass http://api_backend;
  }

  location / {
    root /var/www/angular-test/;
    try_files $uri $uri/ /index.html;
  }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/new.project-g.de/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/new.project-g.de/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

}
server {
    if ($host = new.project-g.de) {
        return 301 https://$host$request_uri;
    } # managed by Certbot


  listen 80;

  server_name mySubdomain.myDomain.myTLD

  gzip on;
    return 404; # managed by Certbot


}
```

`systemctl reload nginx`

Backend should respond under <https://mySubdomain.myDomain.myTLD/api> (if it is running).

### Run Backend as a Systemd Service

This configures Ubuntu so that it automatically starts the REST backend upon boot and restarts it if it crashes.

Create `/etc/systemd/system/fastapi-backend.service` and paste:

```
[Unit]
Description=FastAPI-Backend
After=network.target
Requires=postgresql.service

[Service]
Type=simple
User=fastapitest
Group=fastapitest
DynamicUser=true

WorkingDirectory=/var/www/fastapi-backend
PrivateTmp=true

RuntimeDirectory=uvicorn
ExecStart=python3 -m uvicorn fastapi_backend:app --uds /var/run/uvicorn/fastapi-backend.sock --workers 4
ExecReload=/bin/kill -HUP ${MAINPID}
RestartSec=1
Restart=always

[Install]
WantedBy=multi-user.target
```

`systemctl enable fastapi-backend.service`
`systemctl start fastapi-backend.service`

## Angular Frontend

All of this happens only on the developer machine. The last section "Deploy Angular Frontend to server" explains how to deploy the finished web-app to the server.

We follow the instructions at <https://angular.dev/tutorials/first-app>. I copied the instructions as of 2024-08-03 here for reference. You should follow the up-to-date instructions from the original sources.

### Setup Node.js

From <https://nodejs.org/en/download/package-manager>

```
# installs nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# download and install Node.js (you may need to restart the terminal)
nvm install 20
# verifies the right Node.js version is in the environment
node -v # should print `v20.16.0`
# verifies the right npm version is in the environment
npm -v # should print `10.8.1`
```

### Setup Angular

`npm install -g @angular/cli`

### Create new Angular App

`ng new`

The Angular CLI will ask you for a project name, which is also the name of the directory created.

This will also create a git repo inside the project directory, unless you execute this in a pre-existing git repository. Make sure to do that if you plan to have a common repo for the front- and backend.

### Install Angular Material Component Library

In App_dir

`ng add @angular/material`

Choose all defaults except for
`Set up global Angular Material typography styles? yes`

Maybe add `padding: 1em;` for `body` in `App_dir/src/styles.css` the same file.

### Implement our minimal template

Extend `App_dir/src/app/app.component.ts` by adding our component:

```
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
```

Throw away the hello world page in App_dir/src/app/app.component.html` and replace it with:
```
<h1>Angular/fastapi Template</h1>
<rest-component></rest-component>
```

This should complain that `rest-component` is unknown. Add `RestComponent` to the imports of the `app-root` component in `App_dir/src/app/app.component.ts`:
```
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
```

Add code to provide `HttpClient` to `src/app/app.config.ts`:
```
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from  '@angular/common/http';

import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }), provideRouter(routes), provideAnimationsAsync(), provideHttpClient()]
};
```

On developer machine with manually run fastapi change get request URI to:
`this.http.get<any>("http://localhost:8000/api/").subscribe(data => this.responses = this.responses.concat(data));`

### Test on developer machine

In App_dir:
`ng serve`

Either type `o` and `enter` into the terminal or open `http://localhost:4200` with your browser.

In this mode, the Web-App automatically updates in your browser when you change a source file. fastapi with the `--reload` option does the same. This makes development extremely convenient.

### Deploy Angular Frontend to server

In App dir on developer machine:
`ng build`

Then copy the resulting static HTML+CSS+JavaScript website to your server (replace `myPort`, `mySubdomain.myDomain.myTLD`, `AppName`):
`ssh -p myPort root@mySubdomain.myDomain.myTLD 'rm -rf /var/www/angular-test'`
`scp -rP myPort dist/AppName/browser root@nmySubdomain.myDomain.myTLD:/var/www/angular-test`

### Angular DevTools

Install `Angular DevTools` from browser extension store.

# Development Setup

1. Start VS Code
1. Open parent directory of both the front- and backend (you might want to make this a Git repo)
1. From the backend directory open `fastapi_backend.py`, right click tab, and select "Keep Open"
1. Open a terminal and switch to the backend directory
1. Run `python3 -m uvicorn fastapi_backend:app --host 0.0.0.0 --port 8000 --reload`
1. From the frontend directory open `src/app/app.components.ts`, right click tab, and select "Keep Open"
1. Open another terminal and switch to the fronend directory
1. Run `ng serve`. Once started, type `o` and `enter`. The browser should open your web app.
1. Edit the front- and backend code. Whenever you save, changes in either the front- or backend should be visible and testable in the browser immediately.
1. Change the backend URI in the frontend code from `/api` to `http://localhost:8000/api/`.
1. Use the error messages on the terminal to debug compile time errors.
1. Use the Angular DevTools Browser extension for debugging of runtime errors in the frontend.
1. Attach a Python debugger to debug runtime errors of the backend (I haven't tried this, yet).

## TODO

* use version pinned fastapi from pip with custom env? no auto-updates but stable!
* use version pinned sycopg2?