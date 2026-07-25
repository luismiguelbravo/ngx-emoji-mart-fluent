// modificacion 7
import { ChangeDetectionStrategy, Component, EventEmitter, Input, NgZone, Output, ViewChild, inject, } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EMPTY, Subject, fromEvent, switchMap, takeUntil } from 'rxjs';
import { DEFAULT_BACKGROUNDFN, EmojiService } from './emoji.service';
import * as i0 from "@angular/core";
import * as i1 from "@angular/common";
class EmojiComponent {
    get fluentEmojiUrl() {
        const data = this.getData();
        if (!data || !data.unified)
            return null;
        const codigoUnificado = data.unified.toLowerCase();
        return `assets/fluent-emoji/${codigoUnificado}.webp`;
    }
    get fluentEmojiStyle() {
        const url = this.fluentEmojiUrl;
        if (!url)
            return null;
        return {
            width: `${this.size}px`,
            height: `${this.size}px`,
            display: 'inline-block',
            backgroundImage: `url(${url})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
        };
    }
    skin = 1;
    set = 'apple';
    sheetSize = 64;
    /** Renders the native unicode emoji */
    isNative = false;
    forceSize = false;
    tooltip = false;
    size = 24;
    emoji = '';
    fallback;
    hideObsolete = false;
    sheetRows;
    sheetColumns;
    useButton;
    /**
     * Note: `emojiOver` and `emojiOverOutsideAngular` are dispatched on the same event (`mouseenter`), but
     *       for different purposes. The `emojiOverOutsideAngular` event is listened only in `emoji-category`
     *       component and the category component doesn't care about zone context the callback is being called in.
     *       The `emojiOver` is for backwards compatibility if anyone is listening to this event explicitly in their code.
     */
    emojiOver = new EventEmitter();
    emojiOverOutsideAngular = new EventEmitter();
    /** See comments above, this serves the same purpose. */
    emojiLeave = new EventEmitter();
    emojiLeaveOutsideAngular = new EventEmitter();
    emojiClick = new EventEmitter();
    emojiClickOutsideAngular = new EventEmitter();
    style;
    title = undefined;
    label = '';
    unified;
    custom = false;
    isVisible = true;
    // TODO: replace 4.0.3 w/ dynamic get verison from emoji-datasource in package.json
    backgroundImageFn = DEFAULT_BACKGROUNDFN;
    imageUrlFn;
    set button(button) {
        // Note: `runOutsideAngular` is used to trigger `addEventListener` outside of the Angular zone
        //       too. See `setupMouseEnterListener`. The `switchMap` will subscribe to `fromEvent` considering
        //       the context where the factory is called in.
        this.ngZone.runOutsideAngular(() => this.button$.next(button?.nativeElement));
    }
    /**
     * The subject used to emit whenever view queries are run and `button` or `span` is set/removed.
     * We use subject to keep the reactive behavior so we don't have to add and remove event listeners manually.
     */
    button$ = new Subject();
    destroy$ = new Subject();
    ngZone = inject(NgZone);
    emojiService = inject(EmojiService);
    constructor() {
        this.setupMouseListeners();
    }
    ngOnChanges() {
        if (!this.emoji) {
            return (this.isVisible = false);
        }
        const data = this.getData();
        if (!data) {
            return (this.isVisible = false);
        }
        // const children = this.children;
        this.unified = data.native || null;
        if (data.custom) {
            this.custom = data.custom;
        }
        if (!data.unified && !data.custom) {
            return (this.isVisible = false);
        }
        if (this.tooltip) {
            this.title = data.shortNames[0];
        }
        if (data.obsoletedBy && this.hideObsolete) {
            return (this.isVisible = false);
        }
        this.label = [data.native].concat(data.shortNames).filter(Boolean).join(', ');
        const fluentUrl = this.fluentEmojiUrl;
        if (fluentUrl && !this.isMissingAsset(data.unified)) {
            this.style = {
                width: `${this.size}px`,
                height: `${this.size}px`,
                display: 'inline-block',
                backgroundImage: `url(${fluentUrl})`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
            };
        }
        else {
            // --- FALLBACK NATIVO ---
            // Si no hay webp local, mostramos el emoji nativo de texto con el tamaño correcto
            this.isNative = true;
            this.style = {
                fontSize: `${this.size}px`,
                display: 'inline-block',
                width: `${this.size}px`,
                height: `${this.size}px`,
                textAlign: 'center',
                lineHeight: `${this.size}px`
            };
        }
        return (this.isVisible = true);
    }
    isMissingAsset(unified) {
        if (!unified)
            return true;
        // Las secuencias complejas de familias con ZWJ (como man-man-girl-boy)
        // o unificados muy largos que superen cierta complejidad suelen fallar.
        // También puedes incluir un listado manual si lo prefieres.
        const isComplexFamily = unified.includes('200d');
        const isFlag = unified.startsWith('1f1e6') || unified.includes('-1f1');
        return isComplexFamily || isFlag;
    }
    ngOnDestroy() {
        this.destroy$.next();
    }
    getData() {
        return this.emojiService.getData(this.emoji, this.skin, this.set);
    }
    getSanitizedData() {
        return this.emojiService.getSanitizedData(this.emoji, this.skin, this.set);
    }
    setupMouseListeners() {
        const eventListener$ = (eventName) => this.button$.pipe(
        // Note: `EMPTY` is used to remove event listener once the DOM node is removed.
        switchMap(button => (button ? fromEvent(button, eventName) : EMPTY)), takeUntil(this.destroy$));
        eventListener$('click').subscribe($event => {
            const emoji = this.getSanitizedData();
            this.emojiClickOutsideAngular.emit({ emoji, $event });
            // Note: this is done for backwards compatibility. We run change detection if developers
            //       are listening to `emojiClick` in their code. For instance:
            //       `<ngx-emoji (emojiClick)="..."></ngx-emoji>`.
            if (this.emojiClick.observed) {
                this.ngZone.run(() => this.emojiClick.emit({ emoji, $event }));
            }
        });
        eventListener$('mouseenter').subscribe($event => {
            const emoji = this.getSanitizedData();
            this.emojiOverOutsideAngular.emit({ emoji, $event });
            // Note: this is done for backwards compatibility. We run change detection if developers
            //       are listening to `emojiOver` in their code. For instance:
            //       `<ngx-emoji (emojiOver)="..."></ngx-emoji>`.
            if (this.emojiOver.observed) {
                this.ngZone.run(() => this.emojiOver.emit({ emoji, $event }));
            }
        });
        eventListener$('mouseleave').subscribe($event => {
            const emoji = this.getSanitizedData();
            this.emojiLeaveOutsideAngular.emit({ emoji, $event });
            // Note: this is done for backwards compatibility. We run change detection if developers
            //       are listening to `emojiLeave` in their code. For instance:
            //       `<ngx-emoji (emojiLeave)="..."></ngx-emoji>`.
            if (this.emojiLeave.observed) {
                this.ngZone.run(() => this.emojiLeave.emit({ emoji, $event }));
            }
        });
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.0.5", ngImport: i0, type: EmojiComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "16.0.5", type: EmojiComponent, isStandalone: true, selector: "ngx-emoji", inputs: { skin: "skin", set: "set", sheetSize: "sheetSize", isNative: "isNative", forceSize: "forceSize", tooltip: "tooltip", size: "size", emoji: "emoji", fallback: "fallback", hideObsolete: "hideObsolete", sheetRows: "sheetRows", sheetColumns: "sheetColumns", useButton: "useButton", backgroundImageFn: "backgroundImageFn", imageUrlFn: "imageUrlFn" }, outputs: { emojiOver: "emojiOver", emojiOverOutsideAngular: "emojiOverOutsideAngular", emojiLeave: "emojiLeave", emojiLeaveOutsideAngular: "emojiLeaveOutsideAngular", emojiClick: "emojiClick", emojiClickOutsideAngular: "emojiClickOutsideAngular" }, viewQueries: [{ propertyName: "button", first: true, predicate: ["button"], descendants: true }], usesOnChanges: true, ngImport: i0, template: `
    <ng-template [ngIf]="isVisible">
      <button
        *ngIf="useButton; else spanTpl"
        #button
        type="button"
        [attr.title]="title"
        [attr.aria-label]="label"
        class="emoji-mart-emoji"
        [class.emoji-mart-emoji-native]="isNative"
        [class.emoji-mart-emoji-custom]="custom"
      >
        <span [ngStyle]="style" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
          <ng-content></ng-content>
        </span>
      </button>
    </ng-template>

    <ng-template #spanTpl>
      <span
        #button
        [attr.title]="title"
        [attr.aria-label]="label"
        class="emoji-mart-emoji"
        [class.emoji-mart-emoji-native]="isNative"
        [class.emoji-mart-emoji-custom]="custom"
      >
        <span [ngStyle]="style" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
          <ng-content></ng-content>
        </span>
      </span>
    </ng-template>
  `, isInline: true, dependencies: [{ kind: "ngmodule", type: CommonModule }, { kind: "directive", type: i1.NgIf, selector: "[ngIf]", inputs: ["ngIf", "ngIfThen", "ngIfElse"] }, { kind: "directive", type: i1.NgStyle, selector: "[ngStyle]", inputs: ["ngStyle"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush });
}
export { EmojiComponent };
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.0.5", ngImport: i0, type: EmojiComponent, decorators: [{
            type: Component,
            args: [{
                    selector: 'ngx-emoji',
                    template: `
    <ng-template [ngIf]="isVisible">
      <button
        *ngIf="useButton; else spanTpl"
        #button
        type="button"
        [attr.title]="title"
        [attr.aria-label]="label"
        class="emoji-mart-emoji"
        [class.emoji-mart-emoji-native]="isNative"
        [class.emoji-mart-emoji-custom]="custom"
      >
        <span [ngStyle]="style" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
          <ng-content></ng-content>
        </span>
      </button>
    </ng-template>

    <ng-template #spanTpl>
      <span
        #button
        [attr.title]="title"
        [attr.aria-label]="label"
        class="emoji-mart-emoji"
        [class.emoji-mart-emoji-native]="isNative"
        [class.emoji-mart-emoji-custom]="custom"
      >
        <span [ngStyle]="style" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
          <ng-content></ng-content>
        </span>
      </span>
    </ng-template>
  `,
                    changeDetection: ChangeDetectionStrategy.OnPush,
                    preserveWhitespaces: false,
                    standalone: true,
                    imports: [CommonModule],
                }]
        }], ctorParameters: function () { return []; }, propDecorators: { skin: [{
                type: Input
            }], set: [{
                type: Input
            }], sheetSize: [{
                type: Input
            }], isNative: [{
                type: Input
            }], forceSize: [{
                type: Input
            }], tooltip: [{
                type: Input
            }], size: [{
                type: Input
            }], emoji: [{
                type: Input
            }], fallback: [{
                type: Input
            }], hideObsolete: [{
                type: Input
            }], sheetRows: [{
                type: Input
            }], sheetColumns: [{
                type: Input
            }], useButton: [{
                type: Input
            }], emojiOver: [{
                type: Output
            }], emojiOverOutsideAngular: [{
                type: Output
            }], emojiLeave: [{
                type: Output
            }], emojiLeaveOutsideAngular: [{
                type: Output
            }], emojiClick: [{
                type: Output
            }], emojiClickOutsideAngular: [{
                type: Output
            }], backgroundImageFn: [{
                type: Input
            }], imageUrlFn: [{
                type: Input
            }], button: [{
                type: ViewChild,
                args: ['button', { static: false }]
            }] } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1vamkuY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9waWNrZXIvbmd4LWVtb2ppL2Vtb2ppLmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxpQkFBaUI7QUFDakIsT0FBTyxFQUNMLHVCQUF1QixFQUN2QixTQUFTLEVBRVQsWUFBWSxFQUNaLEtBQUssRUFDTCxNQUFNLEVBR04sTUFBTSxFQUNOLFNBQVMsRUFDVCxNQUFNLEdBQ1AsTUFBTSxlQUFlLENBQUM7QUFDdkIsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBR3ZFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxZQUFZLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQzs7O0FBMEJyRSxNQXdDYSxjQUFjO0lBRXpCLElBQUksY0FBYztRQUNoQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDNUIsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPO1lBQUUsT0FBTyxJQUFJLENBQUM7UUFDeEMsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNuRCxPQUFPLHVCQUF1QixlQUFlLE9BQU8sQ0FBQztJQUN2RCxDQUFDO0lBRUQsSUFBSSxnQkFBZ0I7UUFDbEIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQztRQUNoQyxJQUFJLENBQUMsR0FBRztZQUFFLE9BQU8sSUFBSSxDQUFDO1FBQ3RCLE9BQU87WUFDTCxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxJQUFJO1lBQ3ZCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLElBQUk7WUFDeEIsT0FB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LEtBQUs7Z0JBQ0csT0FBTztzQkFBZixLQUFLO2dCQUNHLElBQUk7c0JBQVosS0FBSztnQkFDRyxLQUFLO3NCQUFiLEtBQUs7Z0JBQ0csUUFBUTtzQkFBaEIsS0FBSztnQkFDRyxZQUFZO3NCQUFwQixLQUFLO2dCQUNHLFNBQVM7c0JBQWpCLEtBQUs7Z0JBQ0csWUFBWTtzQkFBcEIsS0FBSztnQkFDRyxTQUFTO3NCQUFqQixLQUFLO2dCQU9JLFNBQVM7c0JBQWxCLE1BQU07Z0JBQ0csdUJBQXVCO3NCQUFoQyxNQUFNO2dCQUVHLFVBQVU7c0JBQW5CLE1BQU07Z0JBQ0csd0JBQXdCO3NCQUFqQyxNQUFNO2dCQUNHLFVBQVU7c0JBQW5CLE1BQU07Z0JBQ0csd0JBQXdCO3NCQUFqQyxNQUFNO2dCQVNFLGlCQUFpQjtzQkFBekIsS0FBSztnQkFDRyxVQUFVO3NCQUFsQixLQUFLO2dCQUdGLE1BQU07c0JBRFQsU0FBUzt1QkFBQyxRQUFRLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFIiwic291cmNlc0NvbnRlbnQiOlsiLy8gbW9kaWZpY2FjaW9uIDdcbmltcG9ydCB7XG4gIENoYW5nZURldGVjdGlvblN0cmF0ZWd5LFxuICBDb21wb25lbnQsXG4gIEVsZW1lbnRSZWYsXG4gIEV2ZW50RW1pdHRlcixcbiAgSW5wdXQsXG4gIE5nWm9uZSxcbiAgT25DaGFuZ2VzLFxuICBPbkRlc3Ryb3ksXG4gIE91dHB1dCxcbiAgVmlld0NoaWxkLFxuICBpbmplY3QsXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgQ29tbW9uTW9kdWxlIH0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7IEVNUFRZLCBTdWJqZWN0LCBmcm9tRXZlbnQsIHN3aXRjaE1hcCwgdGFrZVVudGlsIH0gZnJvbSAncnhqcyc7XG5cbmltcG9ydCB7IEVtb2ppRGF0YSB9IGZyb20gJy4vZGF0YS9kYXRhLmludGVyZmFjZXMnO1xuaW1wb3J0IHsgREVGQVVMVF9CQUNLR1JPVU5ERk4sIEVtb2ppU2VydmljZSB9IGZyb20gJy4vZW1vamkuc2VydmljZSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRW1vamkge1xuICAvKiogUmVuZGVycyB0aGUgbmF0aXZlIHVuaWNvZGUgZW1vamkgKi9cbiAgaXNOYXRpdmU6IGJvb2xlYW47XG4gIGZvcmNlU2l6ZTogYm9vbGVhbjtcbiAgdG9vbHRpcDogYm9vbGVhbjtcbiAgc2tpbjogMSB8IDIgfCAzIHwgNCB8IDUgfCA2O1xuICBzaGVldFNpemU6IDE2IHwgMjAgfCAzMiB8IDY0IHwgNzI7XG4gIHNoZWV0Um93cz86IG51bWJlcjtcbiAgc2V0OiAnYXBwbGUnIHwgJ2dvb2dsZScgfCAndHdpdHRlcicgfCAnZmFjZWJvb2snIHwgJyc7XG4gIHNpemU6IG51bWJlcjtcbiAgZW1vamk6IHN0cmluZyB8IEVtb2ppRGF0YTtcbiAgYmFja2dyb3VuZEltYWdlRm46IChzZXQ6IHN0cmluZywgc2hlZXRTaXplOiBudW1iZXIpID0+IHN0cmluZztcbiAgZmFsbGJhY2s/OiAoZGF0YTogYW55LCBwcm9wczogYW55KSA9PiBzdHJpbmc7XG4gIGVtb2ppT3ZlcjogRXZlbnRFbWl0dGVyPEVtb2ppRXZlbnQ+O1xuICBlbW9qaUxlYXZlOiBFdmVudEVtaXR0ZXI8RW1vamlFdmVudD47XG4gIGVtb2ppQ2xpY2s6IEV2ZW50RW1pdHRlcjxFbW9qaUV2ZW50PjtcbiAgaW1hZ2VVcmxGbj86IChlbW9qaTogRW1vamlEYXRhIHwgbnVsbCkgPT4gc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEVtb2ppRXZlbnQge1xuICBlbW9qaTogRW1vamlEYXRhO1xuICAkZXZlbnQ6IEV2ZW50O1xufVxuXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICduZ3gtZW1vamknLFxuICB0ZW1wbGF0ZTogYFxuICAgIDxuZy10ZW1wbGF0ZSBbbmdJZl09XCJpc1Zpc2libGVcIj5cbiAgICAgIDxidXR0b25cbiAgICAgICAgKm5nSWY9XCJ1c2VCdXR0b247IGVsc2Ugc3BhblRwbFwiXG4gICAgICAgICNidXR0b25cbiAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgIFthdHRyLnRpdGxlXT1cInRpdGxlXCJcbiAgICAgICAgW2F0dHIuYXJpYS1sYWJlbF09XCJsYWJlbFwiXG4gICAgICAgIGNsYXNzPVwiZW1vamktbWFydC1lbW9qaVwiXG4gICAgICAgIFtjbGFzcy5lbW9qaS1tYXJ0LWVtb2ppLW5hdGl2ZV09XCJpc05hdGl2ZVwiXG4gICAgICAgIFtjbGFzcy5lbW9qaS1tYXJ0LWVtb2ppLWN1c3RvbV09XCJjdXN0b21cIlxuICAgICAgPlxuICAgICAgICA8c3BhbiBbbmdTdHlsZV09XCJzdHlsZVwiIHN0eWxlPVwiZGlzcGxheTogZmxleDsgYWxpZ24taXRlbXM6IGNlbnRlcjsganVzdGlmeS1jb250ZW50OiBjZW50ZXI7IHdpZHRoOiAxMDAlOyBoZWlnaHQ6IDEwMCU7XCI+XG4gICAgICAgICAgPG5nLWNvbnRlbnQ+PC9uZy1jb250ZW50PlxuICAgICAgICA8L3NwYW4+XG4gICAgICA8L2J1dHRvbj5cbiAgICA8L25nLXRlbXBsYXRlPlxuXG4gICAgPG5nLXRlbXBsYXRlICNzcGFuVHBsPlxuICAgICAgPHNwYW5cbiAgICAgICAgI2J1dHRvblxuICAgICAgICBbYXR0ci50aXRsZV09XCJ0aXRsZVwiXG4gICAgICAgIFthdHRyLmFyaWEtbGFiZWxdPVwibGFiZWxcIlxuICAgICAgICBjbGFzcz1cImVtb2ppLW1hcnQtZW1vamlcIlxuICAgICAgICBbY2xhc3MuZW1vamktbWFydC1lbW9qaS1uYXRpdmVdPVwiaXNOYXRpdmVcIlxuICAgICAgICBbY2xhc3MuZW1vamktbWFydC1lbW9qaS1jdXN0b21dPVwiY3VzdG9tXCJcbiAgICAgID5cbiAgICAgICAgPHNwYW4gW25nU3R5bGVdPVwic3R5bGVcIiBzdHlsZT1cImRpc3BsYXk6IGZsZXg7IGFsaWduLWl0ZW1zOiBjZW50ZXI7IGp1c3RpZnktY29udGVudDogY2VudGVyOyB3aWR0aDogMTAwJTsgaGVpZ2h0OiAxMDAlO1wiPlxuICAgICAgICAgIDxuZy1jb250ZW50PjwvbmctY29udGVudD5cbiAgICAgICAgPC9zcGFuPlxuICAgICAgPC9zcGFuPlxuICAgIDwvbmctdGVtcGxhdGU+XG4gIGAsXG4gIGNoYW5nZURldGVjdGlvbjogQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kuT25QdXNoLFxuICBwcmVzZXJ2ZVdoaXRlc3BhY2VzOiBmYWxzZSxcbiAgc3RhbmRhbG9uZTogdHJ1ZSxcbiAgaW1wb3J0czogW0NvbW1vbk1vZHVsZV0sXG59KVxuZXhwb3J0IGNsYXNzIEVtb2ppQ29tcG9uZW50IGltcGxlbWVudHMgT25DaGFuZ2VzLCBFbW9qaSwgT25EZXN0cm95IHtcblxuICBnZXQgZmx1ZW50RW1vamlVcmwoKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgY29uc3QgZGF0YSA9IHRoaXMuZ2V0RGF0YSgpO1xuICAgIGlmICghZGF0YSB8fCAhZGF0YS51bmlmaWVkKSByZXR1cm4gbnVsbDtcbiAgICBjb25zdCBjb2RpZ29VbmlmaWNhZG8gPSBkYXRhLnVuaWZpZWQudG9Mb3dlckNhc2UoKTtcbiAgICByZXR1cm4gYGFzc2V0cy9mbHVlbnQtZW1vamkvJHtjb2RpZ29VbmlmaWNhZG99LndlYnBgO1xuICB9XG5cbiAgZ2V0IGZsdWVudEVtb2ppU3R5bGUoKTogYW55IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmZsdWVudEVtb2ppVXJsO1xuICAgIGlmICghdXJsKSByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4ge1xuICAgICAgd2lkdGg6IGAke3RoaXMuc2l6ZX1weGAsXG4gICAgICBoZWlnaHQ6IGAke3RoaXMuc2l6ZX1weGAsXG4gICAgICBkaXNwbGF5OiAnaW5saW5lLWJsb2NrJyxcbiAgICAgIGJhY2tncm91bmRJbWFnZTogYHVybCgke3VybH0pYCxcbiAgICAgIGJhY2tncm91bmRTaXplOiAnY29udGFpbicsXG4gICAgICBiYWNrZ3JvdW5kUmVwZWF0OiAnbm8tcmVwZWF0JyxcbiAgICAgIGJhY2tncm91bmRQb3NpdGlvbjogJ2NlbnRlcicsXG4gICAgfTtcbiAgfVxuXG5cbiAgQElucHV0KCkgc2tpbjogRW1vamlbJ3NraW4nXSA9IDE7XG4gIEBJbnB1dCgpIHNldDogRW1vamlbJ3NldCddID0gJ2FwcGxlJztcbiAgQElucHV0KCkgc2hlZXRTaXplOiBFbW9qaVsnc2hlZXRTaXplJ10gPSA2NDtcbiAgLyoqIFJlbmRlcnMgdGhlIG5hdGl2ZSB1bmljb2RlIGVtb2ppICovXG4gIEBJbnB1dCgpIGlzTmF0aXZlOiBFbW9qaVsnaXNOYXRpdmUnXSA9IGZhbHNlO1xuICBASW5wdXQoKSBmb3JjZVNpemU6IEVtb2ppWydmb3JjZVNpemUnXSA9IGZhbHNlO1xuICBASW5wdXQoKSB0b29sdGlwOiBFbW9qaVsndG9vbHRpcCddID0gZmFsc2U7XG4gIEBJbnB1dCgpIHNpemU6IEVtb2ppWydzaXplJ10gPSAyNDtcbiAgQElucHV0KCkgZW1vamk6IEVtb2ppWydlbW9qaSddID0gJyc7XG4gIEBJbnB1dCgpIGZhbGxiYWNrPzogRW1vamlbJ2ZhbGxiYWNrJ107XG4gIEBJbnB1dCgpIGhpZGVPYnNvbGV0ZSA9IGZhbHNlO1xuICBASW5wdXQoKSBzaGVldFJvd3M/OiBudW1iZXI7XG4gIEBJbnB1dCgpIHNoZWV0Q29sdW1ucz86IG51bWJlcjtcbiAgQElucHV0KCkgdXNlQnV0dG9uPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIE5vdGU6IGBlbW9qaU92ZXJgIGFuZCBgZW1vamlPdmVyT3V0c2lkZUFuZ3VsYXJgIGFyZSBkaXNwYXRjaGVkIG9uIHRoZSBzYW1lIGV2ZW50IChgbW91c2VlbnRlcmApLCBidXRcbiAgICogICAgICAgZm9yIGRpZmZlcmVudCBwdXJwb3Nlcy4gVGhlIGBlbW9qaU92ZXJPdXRzaWRlQW5ndWxhcmAgZXZlbnQgaXMgbGlzdGVuZWQgb25seSBpbiBgZW1vamktY2F0ZWdvcnlgXG4gICAqICAgICAgIGNvbXBvbmVudCBhbmQgdGhlIGNhdGVnb3J5IGNvbXBvbmVudCBkb2Vzbid0IGNhcmUgYWJvdXQgem9uZSBjb250ZXh0IHRoZSBjYWxsYmFjayBpcyBiZWluZyBjYWxsZWQgaW4uXG4gICAqICAgICAgIFRoZSBgZW1vamlPdmVyYCBpcyBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkgaWYgYW55b25lIGlzIGxpc3RlbmluZyB0byB0aGlzIGV2ZW50IGV4cGxpY2l0bHkgaW4gdGhlaXIgY29kZS5cbiAgICovXG4gIEBPdXRwdXQoKSBlbW9qaU92ZXI6IEVtb2ppWydlbW9qaU92ZXInXSA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgQE91dHB1dCgpIGVtb2ppT3Zlck91dHNpZGVBbmd1bGFyOiBFbW9qaVsnZW1vamlPdmVyJ10gPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gIC8qKiBTZWUgY29tbWVudHMgYWJvdmUsIHRoaXMgc2VydmVzIHRoZSBzYW1lIHB1cnBvc2UuICovXG4gIEBPdXRwdXQoKSBlbW9qaUxlYXZlOiBFbW9qaVsnZW1vamlMZWF2ZSddID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICBAT3V0cHV0KCkgZW1vamlMZWF2ZU91dHNpZGVBbmd1bGFyOiBFbW9qaVsnZW1vamlMZWF2ZSddID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICBAT3V0cHV0KCkgZW1vamlDbGljazogRW1vamlbJ2Vtb2ppQ2xpY2snXSA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgQE91dHB1dCgpIGVtb2ppQ2xpY2tPdXRzaWRlQW5ndWxhcjogRW1vamlbJ2Vtb2ppQ2xpY2snXSA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcblxuICBzdHlsZTogYW55O1xuICB0aXRsZT86IHN0cmluZyA9IHVuZGVmaW5lZDtcbiAgbGFiZWwgPSAnJztcbiAgdW5pZmllZD86IHN0cmluZyB8IG51bGw7XG4gIGN1c3RvbSA9IGZhbHNlO1xuICBpc1Zpc2libGUgPSB0cnVlO1xuICAvLyBUT0RPOiByZXBsYWNlIDQuMC4zIHcvIGR5bmFtaWMgZ2V0IHZlcmlzb24gZnJvbSBlbW9qaS1kYXRhc291cmNlIGluIHBhY2thZ2UuanNvblxuICBASW5wdXQoKSBiYWNrZ3JvdW5kSW1hZ2VGbjogRW1vamlbJ2JhY2tncm91bmRJbWFnZUZuJ10gPSBERUZBVUxUX0JBQ0tHUk9VTkRGTjtcbiAgQElucHV0KCkgaW1hZ2VVcmxGbj86IEVtb2ppWydpbWFnZVVybEZuJ107XG5cbiAgQFZpZXdDaGlsZCgnYnV0dG9uJywgeyBzdGF0aWM6IGZhbHNlIH0pXG4gIHNldCBidXR0b24oYnV0dG9uOiBFbGVtZW50UmVmPEhUTUxFbGVtZW50PiB8IHVuZGVmaW5lZCkge1xuICAgIC8vIE5vdGU6IGBydW5PdXRzaWRlQW5ndWxhcmAgaXMgdXNlZCB0byB0cmlnZ2VyIGBhZGRFdmVudExpc3RlbmVyYCBvdXRzaWRlIG9mIHRoZSBBbmd1bGFyIHpvbmVcbiAgICAvLyAgICAgICB0b28uIFNlZSBgc2V0dXBNb3VzZUVudGVyTGlzdGVuZXJgLiBUaGUgYHN3aXRjaE1hcGAgd2lsbCBzdWJzY3JpYmUgdG8gYGZyb21FdmVudGAgY29uc2lkZXJpbmdcbiAgICAvLyAgICAgICB0aGUgY29udGV4dCB3aGVyZSB0aGUgZmFjdG9yeSBpcyBjYWxsZWQgaW4uXG4gICAgdGhpcy5uZ1pvbmUucnVuT3V0c2lkZUFuZ3VsYXIoKCkgPT4gdGhpcy5idXR0b24kLm5leHQoYnV0dG9uPy5uYXRpdmVFbGVtZW50KSk7XG4gIH1cblxuICAvKipcbiAgICogVGhlIHN1YmplY3QgdXNlZCB0byBlbWl0IHdoZW5ldmVyIHZpZXcgcXVlcmllcyBhcmUgcnVuIGFuZCBgYnV0dG9uYCBvciBgc3BhbmAgaXMgc2V0L3JlbW92ZWQuXG4gICAqIFdlIHVzZSBzdWJqZWN0IHRvIGtlZXAgdGhlIHJlYWN0aXZlIGJlaGF2aW9yIHNvIHdlIGRvbid0IGhhdmUgdG8gYWRkIGFuZCByZW1vdmUgZXZlbnQgbGlzdGVuZXJzIG1hbnVhbGx5LlxuICAgKi9cbiAgcHJpdmF0ZSByZWFkb25seSBidXR0b24kID0gbmV3IFN1YmplY3Q8SFRNTEVsZW1lbnQgfCB1bmRlZmluZWQ+KCk7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBkZXN0cm95JCA9IG5ldyBTdWJqZWN0PHZvaWQ+KCk7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBuZ1pvbmUgPSBpbmplY3QoTmdab25lKTtcbiAgcHJpdmF0ZSByZWFkb25seSBlbW9qaVNlcnZpY2UgPSBpbmplY3QoRW1vamlTZXJ2aWNlKTtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLnNldHVwTW91c2VMaXN0ZW5lcnMoKTtcbiAgfVxuXG4gIG5nT25DaGFuZ2VzKCkge1xuICAgIGlmICghdGhpcy5lbW9qaSkge1xuICAgICAgcmV0dXJuICh0aGlzLmlzVmlzaWJsZSA9IGZhbHNlKTtcbiAgICB9XG4gICAgY29uc3QgZGF0YSA9IHRoaXMuZ2V0RGF0YSgpO1xuICAgIGlmICghZGF0YSkge1xuICAgICAgcmV0dXJuICh0aGlzLmlzVmlzaWJsZSA9IGZhbHNlKTtcbiAgICB9XG4gICAgLy8gY29uc3QgY2hpbGRyZW4gPSB0aGlzLmNoaWxkcmVuO1xuICAgIHRoaXMudW5pZmllZCA9IGRhdGEubmF0aXZlIHx8IG51bGw7XG4gICAgaWYgKGRhdGEuY3VzdG9tKSB7XG4gICAgICB0aGlzLmN1c3RvbSA9IGRhdGEuY3VzdG9tO1xuICAgIH1cbiAgICBpZiAoIWRhdGEudW5pZmllZCAmJiAhZGF0YS5jdXN0b20pIHtcbiAgICAgIHJldHVybiAodGhpcy5pc1Zpc2libGUgPSBmYWxzZSk7XG4gICAgfVxuICAgIGlmICh0aGlzLnRvb2x0aXApIHtcbiAgICAgIHRoaXMudGl0bGUgPSBkYXRhLnNob3J0TmFtZXNbMF07XG4gICAgfVxuICAgIGlmIChkYXRhLm9ic29sZXRlZEJ5ICYmIHRoaXMuaGlkZU9ic29sZXRlKSB7XG4gICAgICByZXR1cm4gKHRoaXMuaXNWaXNpYmxlID0gZmFsc2UpO1xuICAgIH1cblxuICAgIHRoaXMubGFiZWwgPSBbZGF0YS5uYXRpdmVdLmNvbmNhdChkYXRhLnNob3J0TmFtZXMpLmZpbHRlcihCb29sZWFuKS5qb2luKCcsICcpO1xuXG4gICAgY29uc3QgZmx1ZW50VXJsID0gdGhpcy5mbHVlbnRFbW9qaVVybDtcbiAgICBpZiAoZmx1ZW50VXJsICYmICF0aGlzLmlzTWlzc2luZ0Fzc2V0KGRhdGEudW5pZmllZCkpIHtcbiAgICAgIHRoaXMuc3R5bGUgPSB7XG4gICAgICAgIHdpZHRoOiBgJHt0aGlzLnNpemV9cHhgLFxuICAgICAgICBoZWlnaHQ6IGAke3RoaXMuc2l6ZX1weGAsXG4gICAgICAgIGRpc3BsYXk6ICdpbmxpbmUtYmxvY2snLFxuICAgICAgICBiYWNrZ3JvdW5kSW1hZ2U6IGB1cmwoJHtmbHVlbnRVcmx9KWAsXG4gICAgICAgIGJhY2tncm91bmRTaXplOiAnY29udGFpbicsXG4gICAgICAgIGJhY2tncm91bmRSZXBlYXQ6ICduby1yZXBlYXQnLFxuICAgICAgICBiYWNrZ3JvdW5kUG9zaXRpb246ICdjZW50ZXInLFxuICAgICAgfTtcbiAgICB9IGVsc2V7XG4gICAgICAvLyAtLS0gRkFMTEJBQ0sgTkFUSVZPIC0tLVxuICAgICAgLy8gU2kgbm8gaGF5IHdlYnAgbG9jYWwsIG1vc3RyYW1vcyBlbCBlbW9qaSBuYXRpdm8gZGUgdGV4dG8gY29uIGVsIHRhbWHDsW8gY29ycmVjdG9cbiAgICAgIHRoaXMuaXNOYXRpdmUgPSB0cnVlO1xuICAgICAgdGhpcy5zdHlsZSA9IHtcbiAgICAgICAgZm9udFNpemU6IGAke3RoaXMuc2l6ZX1weGAsXG4gICAgICAgIGRpc3BsYXk6ICdpbmxpbmUtYmxvY2snLFxuICAgICAgICB3aWR0aDogYCR7dGhpcy5zaXplfXB4YCxcbiAgICAgICAgaGVpZ2h0OiBgJHt0aGlzLnNpemV9cHhgLFxuICAgICAgICB0ZXh0QWxpZ246ICdjZW50ZXInLFxuICAgICAgICBsaW5lSGVpZ2h0OiBgJHt0aGlzLnNpemV9cHhgXG4gICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gKHRoaXMuaXNWaXNpYmxlID0gdHJ1ZSk7XG4gIH1cblxuICBwcml2YXRlIGlzTWlzc2luZ0Fzc2V0KHVuaWZpZWQ/OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBpZiAoIXVuaWZpZWQpIHJldHVybiB0cnVlO1xuXG4gICAgLy8gTGFzIHNlY3VlbmNpYXMgY29tcGxlamFzIGRlIGZhbWlsaWFzIGNvbiBaV0ogKGNvbW8gbWFuLW1hbi1naXJsLWJveSlcbiAgICAvLyBvIHVuaWZpY2Fkb3MgbXV5IGxhcmdvcyBxdWUgc3VwZXJlbiBjaWVydGEgY29tcGxlamlkYWQgc3VlbGVuIGZhbGxhci5cbiAgICAvLyBUYW1iacOpbiBwdWVkZXMgaW5jbHVpciB1biBsaXN0YWRvIG1hbnVhbCBzaSBsbyBwcmVmaWVyZXMuXG4gICAgY29uc3QgaXNDb21wbGV4RmFtaWx5ID0gdW5pZmllZC5pbmNsdWRlcygnMjAwZCcpO1xuICAgIGNvbnN0IGlzRmxhZyA9IHVuaWZpZWQuc3RhcnRzV2l0aCgnMWYxZTYnKSB8fCB1bmlmaWVkLmluY2x1ZGVzKCctMWYxJyk7XG5cbiAgICByZXR1cm4gaXNDb21wbGV4RmFtaWx5IHx8IGlzRmxhZztcbiAgfVxuXG5cbiAgbmdPbkRlc3Ryb3koKTogdm9pZCB7XG4gICAgdGhpcy5kZXN0cm95JC5uZXh0KCk7XG4gIH1cblxuICBnZXREYXRhKCkge1xuICAgIHJldHVybiB0aGlzLmVtb2ppU2VydmljZS5nZXREYXRhKHRoaXMuZW1vamksIHRoaXMuc2tpbiwgdGhpcy5zZXQpO1xuICB9XG5cbiAgZ2V0U2FuaXRpemVkRGF0YSgpOiBFbW9qaURhdGEge1xuICAgIHJldHVybiB0aGlzLmVtb2ppU2VydmljZS5nZXRTYW5pdGl6ZWREYXRhKHRoaXMuZW1vamksIHRoaXMuc2tpbiwgdGhpcy5zZXQpIGFzIEVtb2ppRGF0YTtcbiAgfVxuXG4gIHByaXZhdGUgc2V0dXBNb3VzZUxpc3RlbmVycygpOiB2b2lkIHtcbiAgICBjb25zdCBldmVudExpc3RlbmVyJCA9IChldmVudE5hbWU6IHN0cmluZykgPT5cbiAgICAgIHRoaXMuYnV0dG9uJC5waXBlKFxuICAgICAgICAvLyBOb3RlOiBgRU1QVFlgIGlzIHVzZWQgdG8gcmVtb3ZlIGV2ZW50IGxpc3RlbmVyIG9uY2UgdGhlIERPTSBub2RlIGlzIHJlbW92ZWQuXG4gICAgICAgIHN3aXRjaE1hcChidXR0b24gPT4gKGJ1dHRvbiA/IGZyb21FdmVudChidXR0b24sIGV2ZW50TmFtZSkgOiBFTVBUWSkpLFxuICAgICAgICB0YWtlVW50aWwodGhpcy5kZXN0cm95JCksXG4gICAgICApO1xuXG4gICAgZXZlbnRMaXN0ZW5lciQoJ2NsaWNrJykuc3Vic2NyaWJlKCRldmVudCA9PiB7XG4gICAgICBjb25zdCBlbW9qaSA9IHRoaXMuZ2V0U2FuaXRpemVkRGF0YSgpO1xuICAgICAgdGhpcy5lbW9qaUNsaWNrT3V0c2lkZUFuZ3VsYXIuZW1pdCh7IGVtb2ppLCAkZXZlbnQgfSk7XG4gICAgICAvLyBOb3RlOiB0aGlzIGlzIGRvbmUgZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5LiBXZSBydW4gY2hhbmdlIGRldGVjdGlvbiBpZiBkZXZlbG9wZXJzXG4gICAgICAvLyAgICAgICBhcmUgbGlzdGVuaW5nIHRvIGBlbW9qaUNsaWNrYCBpbiB0aGVpciBjb2RlLiBGb3IgaW5zdGFuY2U6XG4gICAgICAvLyAgICAgICBgPG5neC1lbW9qaSAoZW1vamlDbGljayk9XCIuLi5cIj48L25neC1lbW9qaT5gLlxuICAgICAgaWYgKHRoaXMuZW1vamlDbGljay5vYnNlcnZlZCkge1xuICAgICAgICB0aGlzLm5nWm9uZS5ydW4oKCkgPT4gdGhpcy5lbW9qaUNsaWNrLmVtaXQoeyBlbW9qaSwgJGV2ZW50IH0pKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGV2ZW50TGlzdGVuZXIkKCdtb3VzZWVudGVyJykuc3Vic2NyaWJlKCRldmVudCA9PiB7XG4gICAgICBjb25zdCBlbW9qaSA9IHRoaXMuZ2V0U2FuaXRpemVkRGF0YSgpO1xuICAgICAgdGhpcy5lbW9qaU92ZXJPdXRzaWRlQW5ndWxhci5lbWl0KHsgZW1vamksICRldmVudCB9KTtcbiAgICAgIC8vIE5vdGU6IHRoaXMgaXMgZG9uZSBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkuIFdlIHJ1biBjaGFuZ2UgZGV0ZWN0aW9uIGlmIGRldmVsb3BlcnNcbiAgICAgIC8vICAgICAgIGFyZSBsaXN0ZW5pbmcgdG8gYGVtb2ppT3ZlcmAgaW4gdGhlaXIgY29kZS4gRm9yIGluc3RhbmNlOlxuICAgICAgLy8gICAgICAgYDxuZ3gtZW1vamkgKGVtb2ppT3Zlcik9XCIuLi5cIj48L25neC1lbW9qaT5gLlxuICAgICAgaWYgKHRoaXMuZW1vamlPdmVyLm9ic2VydmVkKSB7XG4gICAgICAgIHRoaXMubmdab25lLnJ1bigoKSA9PiB0aGlzLmVtb2ppT3Zlci5lbWl0KHsgZW1vamksICRldmVudCB9KSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBldmVudExpc3RlbmVyJCgnbW91c2VsZWF2ZScpLnN1YnNjcmliZSgkZXZlbnQgPT4ge1xuICAgICAgY29uc3QgZW1vamkgPSB0aGlzLmdldFNhbml0aXplZERhdGEoKTtcbiAgICAgIHRoaXMuZW1vamlMZWF2ZU91dHNpZGVBbmd1bGFyLmVtaXQoeyBlbW9qaSwgJGV2ZW50IH0pO1xuICAgICAgLy8gTm90ZTogdGhpcyBpcyBkb25lIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eS4gV2UgcnVuIGNoYW5nZSBkZXRlY3Rpb24gaWYgZGV2ZWxvcGVyc1xuICAgICAgLy8gICAgICAgYXJlIGxpc3RlbmluZyB0byBgZW1vamlMZWF2ZWAgaW4gdGhlaXIgY29kZS4gRm9yIGluc3RhbmNlOlxuICAgICAgLy8gICAgICAgYDxuZ3gtZW1vamkgKGVtb2ppTGVhdmUpPVwiLi4uXCI+PC9uZ3gtZW1vamk+YC5cbiAgICAgIGlmICh0aGlzLmVtb2ppTGVhdmUub2JzZXJ2ZWQpIHtcbiAgICAgICAgdGhpcy5uZ1pvbmUucnVuKCgpID0+IHRoaXMuZW1vamlMZWF2ZS5lbWl0KHsgZW1vamksICRldmVudCB9KSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==