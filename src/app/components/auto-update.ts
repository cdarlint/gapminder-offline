import {Component, OnInit, NgZone} from '@angular/core';

declare var electron: any;

const ipc = electron.ipcRenderer;

@Component({
  selector: 'ae-auto-update',
  styles: [`
      .label {
          font-size: smaller;
      }
  `],
  template: `
      <div *ngIf = "platform" style = "display: inline;">
          <div class = "label" style="margin-top: 2px;">
              Your current version is too old for automatic update. Please download new version
              <a href = "#" class = "one" (click) = "goUrl(links[platform])">from here</a> and install it.
          </div>
      </div>
  `
})
export class AutoUpdateComponent implements OnInit {
  public requestToUpdate: boolean = false;
  public requestToProgress: boolean = false;
  public requestToExitAndFinishUpdate: boolean = false;
  public max: number = 200;
  public progress: number = 0;
  public platform: string;
  public links: any = {
    linux: 'https://s3-eu-west-1.amazonaws.com/gapminder-offline/0.70.16/Gapminder%20Offline-linux.zip',
    darwin: 'https://s3-eu-west-1.amazonaws.com/gapminder-offline/0.70.16/Install%20Gapminder%20Offline.dmg',
    win32: 'https://s3-eu-west-1.amazonaws.com/gapminder-offline/0.70.16/Gapminder%20Offline-win64.zip'
  };

  constructor(private _ngZone: NgZone) {
  }

  public goUrl(link: string) {
    electron.shell.openExternal(link);
  }

  ngOnInit() {
    electron.ipcRenderer.send('check-version');

    ipc.on('request-and-update', (event, version) => {
      this._ngZone.run(() => {
        if (version) {
          this.requestToUpdate = true;
          this.processUpdateRequest(version);
        }
      });
    });

    ipc.on('request-to-update', (event, platform) => {
      this.platform = platform;
      /*this._ngZone.run(() => {
       if (version) {
       this.requestToUpdate = true;
       }
       });*/
    });

    ipc.on('download-progress', (event: any, progress: string) => {
      const progressValue = Number(progress);

      if (progressValue > 0) {
        this._ngZone.run(() => {
          this.progress = progressValue;
        });
      }
    });

    ipc.on('unpack-progress', (event: any, progress: string) => {
      const progressValue = Number(progress);

      if (progressValue > 0) {
        this._ngZone.run(() => {
          this.progress = 100 + progressValue;
        });
      }
    });

    ipc.on('unpack-complete', (event, error) => {
      if (error) {
        console.log(error);
      }

      this._ngZone.run(() => {
        this.requestToProgress = false;
        this.requestToExitAndFinishUpdate = true;
        electron.ipcRenderer.send('new-version-ready-flag');
      });
    });
  }

  processUpdateRequest(version?: string) {
    electron.ipcRenderer.send('prepare-update', version);
    this.resetUpdateRequest();

    this._ngZone.run(() => {
      this.requestToProgress = true;
      this.progress = 0;
    });
  }

  resetUpdateRequest() {
    this.requestToUpdate = false;
  }

  resetExitAndFinishUpdateRequest() {
    this.requestToExitAndFinishUpdate = false;
  }

  processExitAndFinishUpdateRequest() {
    electron.ipcRenderer.send('exit-and-update');
  }
}
