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
    unifiedText = null;
    fluentUrl = null;
    ngOnChanges() {
        if (!this.emoji) {
            return (this.isVisible = false);
        }
        const data = this.getData();
        if (!data) {
            return (this.isVisible = false);
        }
        this.unifiedText = data.native || null;
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
        // Verificamos si es una familia compleja con ZWJ que sabemos que no tiene asset
        const isComplexFamily = data.unified && data.unified.includes('200d');
        if (data.unified && !isComplexFamily) {
            const codigoUnificado = data.unified.toLowerCase();
            this.fluentUrl = `assets/fluent-emoji/${codigoUnificado}.webp`;
            this.isNative = false;
            this.style = {
                width: `${this.size}px`,
                height: `${this.size}px`,
                display: 'inline-block',
                backgroundImage: `url(${this.fluentUrl})`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
            };
        }
        else {
            // Fallback nativo inmediato para casos complejos
            this.isNative = true;
            this.fluentUrl = null;
        }
        return (this.isVisible = true);
    }
    isMissingAsset(unified) {
        if (!unified)
            return true;
        const lowerUnified = unified.toLowerCase();
        // Listado exacto de los unificados que sabemos que no tienen .webp local
        const missingAssets = new Set([
            '1f468-200d-1f468-200d-1f467-200d-1f466',
            '1f469-200d-1f469-200d-1f467-200d-1f466',
            '1f1e7-1f1f1',
            '1f1e7-1f1f6',
            '1f1e7-1f1fb',
            '1f1e8-1f1f5',
            '1f1e9-1f1ec',
            '1f1ea-1f1e6',
            '1f1f2-1f1eb',
            '1f1ed-1f1f2',
            '1f1f7-1f1ea',
            '1f1f8-1f1ef',
            '1f1f9-1f1e9',
            '1f1f9-1f1eb',
            '1f1fa-1f1f2',
            '1f3f4-e0067-e0062-e0065-e006e-e0067-e007f',
            '1f3f4-e0067-e0062-e0073-e0063-e0074-e007f',
            '1f3f4-e0067-e0062-e0077-e006c-e0073-e007f' // Gales
        ]);
        if (missingAssets.has(lowerUnified)) {
            return true;
        }
        // Patrón genérico por si aparece alguna otra variante con ZWJ
        return lowerUnified.includes('200d');
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
        <span style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
          <span *ngIf="!isNative && fluentUrl; else nativeText" [ngStyle]="style"></span>
          <ng-template #nativeText>
            <span [style.font-size.px]="size">{{ unifiedText }}</span>
          </ng-template>
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
        <span style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
          <span *ngIf="!isNative && fluentUrl; else nativeText" [ngStyle]="style"></span>
          <ng-template #nativeText>
            <span [style.font-size.px]="size">{{ unifiedText }}</span>
          </ng-template>
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
        <span style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
          <span *ngIf="!isNative && fluentUrl; else nativeText" [ngStyle]="style"></span>
          <ng-template #nativeText>
            <span [style.font-size.px]="size">{{ unifiedText }}</span>
          </ng-template>
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
        <span style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
          <span *ngIf="!isNative && fluentUrl; else nativeText" [ngStyle]="style"></span>
          <ng-template #nativeText>
            <span [style.font-size.px]="size">{{ unifiedText }}</span>
          </ng-template>
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1vamkuY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9waWNrZXIvbmd4LWVtb2ppL2Vtb2ppLmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxpQkFBaUI7QUFDakIsT0FBTyxFQUNMLHVCQUF1QixFQUN2QixTQUFTLEVBRVQsWUFBWSxFQUNaLEtBQUssRUFDTCxNQUFNLEVBR04sTUFBTSxFQUNOLFNBQVMsRUFDVCxNQUFNLEdBQ1AsTUFBTSxlQUFlLENBQUM7QUFDdkIsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBR3ZFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxZQUFZLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQzs7O0FBMEJyRSxNQThDYSxjQUFjO0lBRXpCLElBQUksY0FBYztRQUNoQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDNUIsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPO1lBQUUsT0FBTyxJQUFJLENBQUM7UUFDeEMsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNuRCxPQUFPLHVCQUF1QixlQUFlLE9BQU8sQ0FBQztJQUN2RCxDQUFDO0lBRUQsSUFBSSxnQkFBZ0I7UUFDbEIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQztRQUNoQyxJQUFJLENBQUMsR0FBRztZQUFFLE9BQU8sSUFBSSxDQUFDO1FBQ3RCLE9BQU87WUFDTCxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxJQUFJO1lBQ3ZCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLElBQUk7WUFDeEIsT0FB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Ozs7Ozs7OztHQXNDVDtvQkFDRCxlQUFlLEVBQUUsdUJBQXVCLENBQUMsTUFBTTtvQkFDL0MsbUJBQW1CLEVBQUUsS0FBSztvQkFDMUIsVUFBVSxFQUFFLElBQUk7b0JBQ2hCLE9BQU8sRUFBRSxDQUFDLFlBQVksQ0FBQztpQkFDeEI7MEVBeUJVLElBQUk7c0JBQVosS0FBSztnQkFDRyxHQUFHO3NCQUFYLEtBQUs7Z0JBQ0csU0FBUztzQkFBakIsS0FBSztnQkFFRyxRQUFRO3NCQUFoQixLQUFLO2dCQUNHLFNBQVM7c0JBQWpCLEtBQUs7Z0JBQ0csT0FBTztzQkFBZixLQUFLO2dCQUNHLElBQUk7c0JBQVosS0FBSztnQkFDRyxLQUFLO3NCQUFiLEtBQUs7Z0JBQ0csUUFBUTtzQkFBaEIsS0FBSztnQkFDRyxZQUFZO3NCQUFwQixLQUFLO2dCQUNHLFNBQVM7c0JBQWpCLEtBQUs7Z0JBQ0csWUFBWTtzQkFBcEIsS0FBSztnQkFDRyxTQUFTO3NCQUFqQixLQUFLO2dCQU9JLFNBQVM7c0JBQWxCLE1BQU07Z0JBQ0csdUJBQXVCO3NCQUFoQyxNQUFNO2dCQUVHLFVBQVU7c0JBQW5CLE1BQU07Z0JBQ0csd0JBQXdCO3NCQUFqQyxNQUFNO2dCQUNHLFVBQVU7c0JBQW5CLE1BQU07Z0JBQ0csd0JBQXdCO3NCQUFqQyxNQUFNO2dCQVNFLGlCQUFpQjtzQkFBekIsS0FBSztnQkFDRyxVQUFVO3NCQUFsQixLQUFLO2dCQUdGLE1BQU07c0JBRFQsU0FBUzt1QkFBQyxRQUFRLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFIiwic291cmNlc0NvbnRlbnQiOlsiLy8gbW9kaWZpY2FjaW9uIDdcbmltcG9ydCB7XG4gIENoYW5nZURldGVjdGlvblN0cmF0ZWd5LFxuICBDb21wb25lbnQsXG4gIEVsZW1lbnRSZWYsXG4gIEV2ZW50RW1pdHRlcixcbiAgSW5wdXQsXG4gIE5nWm9uZSxcbiAgT25DaGFuZ2VzLFxuICBPbkRlc3Ryb3ksXG4gIE91dHB1dCxcbiAgVmlld0NoaWxkLFxuICBpbmplY3QsXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgQ29tbW9uTW9kdWxlIH0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7IEVNUFRZLCBTdWJqZWN0LCBmcm9tRXZlbnQsIHN3aXRjaE1hcCwgdGFrZVVudGlsIH0gZnJvbSAncnhqcyc7XG5cbmltcG9ydCB7IEVtb2ppRGF0YSB9IGZyb20gJy4vZGF0YS9kYXRhLmludGVyZmFjZXMnO1xuaW1wb3J0IHsgREVGQVVMVF9CQUNLR1JPVU5ERk4sIEVtb2ppU2VydmljZSB9IGZyb20gJy4vZW1vamkuc2VydmljZSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRW1vamkge1xuICAvKiogUmVuZGVycyB0aGUgbmF0aXZlIHVuaWNvZGUgZW1vamkgKi9cbiAgaXNOYXRpdmU6IGJvb2xlYW47XG4gIGZvcmNlU2l6ZTogYm9vbGVhbjtcbiAgdG9vbHRpcDogYm9vbGVhbjtcbiAgc2tpbjogMSB8IDIgfCAzIHwgNCB8IDUgfCA2O1xuICBzaGVldFNpemU6IDE2IHwgMjAgfCAzMiB8IDY0IHwgNzI7XG4gIHNoZWV0Um93cz86IG51bWJlcjtcbiAgc2V0OiAnYXBwbGUnIHwgJ2dvb2dsZScgfCAndHdpdHRlcicgfCAnZmFjZWJvb2snIHwgJyc7XG4gIHNpemU6IG51bWJlcjtcbiAgZW1vamk6IHN0cmluZyB8IEVtb2ppRGF0YTtcbiAgYmFja2dyb3VuZEltYWdlRm46IChzZXQ6IHN0cmluZywgc2hlZXRTaXplOiBudW1iZXIpID0+IHN0cmluZztcbiAgZmFsbGJhY2s/OiAoZGF0YTogYW55LCBwcm9wczogYW55KSA9PiBzdHJpbmc7XG4gIGVtb2ppT3ZlcjogRXZlbnRFbWl0dGVyPEVtb2ppRXZlbnQ+O1xuICBlbW9qaUxlYXZlOiBFdmVudEVtaXR0ZXI8RW1vamlFdmVudD47XG4gIGVtb2ppQ2xpY2s6IEV2ZW50RW1pdHRlcjxFbW9qaUV2ZW50PjtcbiAgaW1hZ2VVcmxGbj86IChlbW9qaTogRW1vamlEYXRhIHwgbnVsbCkgPT4gc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEVtb2ppRXZlbnQge1xuICBlbW9qaTogRW1vamlEYXRhO1xuICAkZXZlbnQ6IEV2ZW50O1xufVxuXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICduZ3gtZW1vamknLFxuICB0ZW1wbGF0ZTogYFxuICAgIDxuZy10ZW1wbGF0ZSBbbmdJZl09XCJpc1Zpc2libGVcIj5cbiAgICAgIDxidXR0b25cbiAgICAgICAgKm5nSWY9XCJ1c2VCdXR0b247IGVsc2Ugc3BhblRwbFwiXG4gICAgICAgICNidXR0b25cbiAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgIFthdHRyLnRpdGxlXT1cInRpdGxlXCJcbiAgICAgICAgW2F0dHIuYXJpYS1sYWJlbF09XCJsYWJlbFwiXG4gICAgICAgIGNsYXNzPVwiZW1vamktbWFydC1lbW9qaVwiXG4gICAgICAgIFtjbGFzcy5lbW9qaS1tYXJ0LWVtb2ppLW5hdGl2ZV09XCJpc05hdGl2ZVwiXG4gICAgICAgIFtjbGFzcy5lbW9qaS1tYXJ0LWVtb2ppLWN1c3RvbV09XCJjdXN0b21cIlxuICAgICAgPlxuICAgICAgICA8c3BhbiBzdHlsZT1cImRpc3BsYXk6IGZsZXg7IGFsaWduLWl0ZW1zOiBjZW50ZXI7IGp1c3RpZnktY29udGVudDogY2VudGVyOyB3aWR0aDogMTAwJTsgaGVpZ2h0OiAxMDAlO1wiPlxuICAgICAgICAgIDxzcGFuICpuZ0lmPVwiIWlzTmF0aXZlICYmIGZsdWVudFVybDsgZWxzZSBuYXRpdmVUZXh0XCIgW25nU3R5bGVdPVwic3R5bGVcIj48L3NwYW4+XG4gICAgICAgICAgPG5nLXRlbXBsYXRlICNuYXRpdmVUZXh0PlxuICAgICAgICAgICAgPHNwYW4gW3N0eWxlLmZvbnQtc2l6ZS5weF09XCJzaXplXCI+e3sgdW5pZmllZFRleHQgfX08L3NwYW4+XG4gICAgICAgICAgPC9uZy10ZW1wbGF0ZT5cbiAgICAgICAgPC9zcGFuPlxuICAgICAgPC9idXR0b24+XG4gICAgPC9uZy10ZW1wbGF0ZT5cblxuICAgIDxuZy10ZW1wbGF0ZSAjc3BhblRwbD5cbiAgICAgIDxzcGFuXG4gICAgICAgICNidXR0b25cbiAgICAgICAgW2F0dHIudGl0bGVdPVwidGl0bGVcIlxuICAgICAgICBbYXR0ci5hcmlhLWxhYmVsXT1cImxhYmVsXCJcbiAgICAgICAgY2xhc3M9XCJlbW9qaS1tYXJ0LWVtb2ppXCJcbiAgICAgICAgW2NsYXNzLmVtb2ppLW1hcnQtZW1vamktbmF0aXZlXT1cImlzTmF0aXZlXCJcbiAgICAgICAgW2NsYXNzLmVtb2ppLW1hcnQtZW1vamktY3VzdG9tXT1cImN1c3RvbVwiXG4gICAgICA+XG4gICAgICAgIDxzcGFuIHN0eWxlPVwiZGlzcGxheTogZmxleDsgYWxpZ24taXRlbXM6IGNlbnRlcjsganVzdGlmeS1jb250ZW50OiBjZW50ZXI7IHdpZHRoOiAxMDAlOyBoZWlnaHQ6IDEwMCU7XCI+XG4gICAgICAgICAgPHNwYW4gKm5nSWY9XCIhaXNOYXRpdmUgJiYgZmx1ZW50VXJsOyBlbHNlIG5hdGl2ZVRleHRcIiBbbmdTdHlsZV09XCJzdHlsZVwiPjwvc3Bhbj5cbiAgICAgICAgICA8bmctdGVtcGxhdGUgI25hdGl2ZVRleHQ+XG4gICAgICAgICAgICA8c3BhbiBbc3R5bGUuZm9udC1zaXplLnB4XT1cInNpemVcIj57eyB1bmlmaWVkVGV4dCB9fTwvc3Bhbj5cbiAgICAgICAgICA8L25nLXRlbXBsYXRlPlxuICAgICAgICA8L3NwYW4+XG4gICAgICA8L3NwYW4+XG4gICAgPC9uZy10ZW1wbGF0ZT5cbiAgYCxcbiAgY2hhbmdlRGV0ZWN0aW9uOiBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneS5PblB1c2gsXG4gIHByZXNlcnZlV2hpdGVzcGFjZXM6IGZhbHNlLFxuICBzdGFuZGFsb25lOiB0cnVlLFxuICBpbXBvcnRzOiBbQ29tbW9uTW9kdWxlXSxcbn0pXG5leHBvcnQgY2xhc3MgRW1vamlDb21wb25lbnQgaW1wbGVtZW50cyBPbkNoYW5nZXMsIEVtb2ppLCBPbkRlc3Ryb3kge1xuXG4gIGdldCBmbHVlbnRFbW9qaVVybCgpOiBzdHJpbmcgfCBudWxsIHtcbiAgICBjb25zdCBkYXRhID0gdGhpcy5nZXREYXRhKCk7XG4gICAgaWYgKCFkYXRhIHx8ICFkYXRhLnVuaWZpZWQpIHJldHVybiBudWxsO1xuICAgIGNvbnN0IGNvZGlnb1VuaWZpY2FkbyA9IGRhdGEudW5pZmllZC50b0xvd2VyQ2FzZSgpO1xuICAgIHJldHVybiBgYXNzZXRzL2ZsdWVudC1lbW9qaS8ke2NvZGlnb1VuaWZpY2Fkb30ud2VicGA7XG4gIH1cblxuICBnZXQgZmx1ZW50RW1vamlTdHlsZSgpOiBhbnkge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuZmx1ZW50RW1vamlVcmw7XG4gICAgaWYgKCF1cmwpIHJldHVybiBudWxsO1xuICAgIHJldHVybiB7XG4gICAgICB3aWR0aDogYCR7dGhpcy5zaXplfXB4YCxcbiAgICAgIGhlaWdodDogYCR7dGhpcy5zaXplfXB4YCxcbiAgICAgIGRpc3BsYXk6ICdpbmxpbmUtYmxvY2snLFxuICAgICAgYmFja2dyb3VuZEltYWdlOiBgdXJsKCR7dXJsfSlgLFxuICAgICAgYmFja2dyb3VuZFNpemU6ICdjb250YWluJyxcbiAgICAgIGJhY2tncm91bmRSZXBlYXQ6ICduby1yZXBlYXQnLFxuICAgICAgYmFja2dyb3VuZFBvc2l0aW9uOiAnY2VudGVyJyxcbiAgICB9O1xuICB9XG5cblxuICBASW5wdXQoKSBza2luOiBFbW9qaVsnc2tpbiddID0gMTtcbiAgQElucHV0KCkgc2V0OiBFbW9qaVsnc2V0J10gPSAnYXBwbGUnO1xuICBASW5wdXQoKSBzaGVldFNpemU6IEVtb2ppWydzaGVldFNpemUnXSA9IDY0O1xuICAvKiogUmVuZGVycyB0aGUgbmF0aXZlIHVuaWNvZGUgZW1vamkgKi9cbiAgQElucHV0KCkgaXNOYXRpdmU6IEVtb2ppWydpc05hdGl2ZSddID0gZmFsc2U7XG4gIEBJbnB1dCgpIGZvcmNlU2l6ZTogRW1vamlbJ2ZvcmNlU2l6ZSddID0gZmFsc2U7XG4gIEBJbnB1dCgpIHRvb2x0aXA6IEVtb2ppWyd0b29sdGlwJ10gPSBmYWxzZTtcbiAgQElucHV0KCkgc2l6ZTogRW1vamlbJ3NpemUnXSA9IDI0O1xuICBASW5wdXQoKSBlbW9qaTogRW1vamlbJ2Vtb2ppJ10gPSAnJztcbiAgQElucHV0KCkgZmFsbGJhY2s/OiBFbW9qaVsnZmFsbGJhY2snXTtcbiAgQElucHV0KCkgaGlkZU9ic29sZXRlID0gZmFsc2U7XG4gIEBJbnB1dCgpIHNoZWV0Um93cz86IG51bWJlcjtcbiAgQElucHV0KCkgc2hlZXRDb2x1bW5zPzogbnVtYmVyO1xuICBASW5wdXQoKSB1c2VCdXR0b24/OiBib29sZWFuO1xuICAvKipcbiAgICogTm90ZTogYGVtb2ppT3ZlcmAgYW5kIGBlbW9qaU92ZXJPdXRzaWRlQW5ndWxhcmAgYXJlIGRpc3BhdGNoZWQgb24gdGhlIHNhbWUgZXZlbnQgKGBtb3VzZWVudGVyYCksIGJ1dFxuICAgKiAgICAgICBmb3IgZGlmZmVyZW50IHB1cnBvc2VzLiBUaGUgYGVtb2ppT3Zlck91dHNpZGVBbmd1bGFyYCBldmVudCBpcyBsaXN0ZW5lZCBvbmx5IGluIGBlbW9qaS1jYXRlZ29yeWBcbiAgICogICAgICAgY29tcG9uZW50IGFuZCB0aGUgY2F0ZWdvcnkgY29tcG9uZW50IGRvZXNuJ3QgY2FyZSBhYm91dCB6b25lIGNvbnRleHQgdGhlIGNhbGxiYWNrIGlzIGJlaW5nIGNhbGxlZCBpbi5cbiAgICogICAgICAgVGhlIGBlbW9qaU92ZXJgIGlzIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eSBpZiBhbnlvbmUgaXMgbGlzdGVuaW5nIHRvIHRoaXMgZXZlbnQgZXhwbGljaXRseSBpbiB0aGVpciBjb2RlLlxuICAgKi9cbiAgQE91dHB1dCgpIGVtb2ppT3ZlcjogRW1vamlbJ2Vtb2ppT3ZlciddID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICBAT3V0cHV0KCkgZW1vamlPdmVyT3V0c2lkZUFuZ3VsYXI6IEVtb2ppWydlbW9qaU92ZXInXSA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgLyoqIFNlZSBjb21tZW50cyBhYm92ZSwgdGhpcyBzZXJ2ZXMgdGhlIHNhbWUgcHVycG9zZS4gKi9cbiAgQE91dHB1dCgpIGVtb2ppTGVhdmU6IEVtb2ppWydlbW9qaUxlYXZlJ10gPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gIEBPdXRwdXQoKSBlbW9qaUxlYXZlT3V0c2lkZUFuZ3VsYXI6IEVtb2ppWydlbW9qaUxlYXZlJ10gPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gIEBPdXRwdXQoKSBlbW9qaUNsaWNrOiBFbW9qaVsnZW1vamlDbGljayddID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICBAT3V0cHV0KCkgZW1vamlDbGlja091dHNpZGVBbmd1bGFyOiBFbW9qaVsnZW1vamlDbGljayddID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuXG4gIHN0eWxlOiBhbnk7XG4gIHRpdGxlPzogc3RyaW5nID0gdW5kZWZpbmVkO1xuICBsYWJlbCA9ICcnO1xuICB1bmlmaWVkPzogc3RyaW5nIHwgbnVsbDtcbiAgY3VzdG9tID0gZmFsc2U7XG4gIGlzVmlzaWJsZSA9IHRydWU7XG4gIC8vIFRPRE86IHJlcGxhY2UgNC4wLjMgdy8gZHluYW1pYyBnZXQgdmVyaXNvbiBmcm9tIGVtb2ppLWRhdGFzb3VyY2UgaW4gcGFja2FnZS5qc29uXG4gIEBJbnB1dCgpIGJhY2tncm91bmRJbWFnZUZuOiBFbW9qaVsnYmFja2dyb3VuZEltYWdlRm4nXSA9IERFRkFVTFRfQkFDS0dST1VOREZOO1xuICBASW5wdXQoKSBpbWFnZVVybEZuPzogRW1vamlbJ2ltYWdlVXJsRm4nXTtcblxuICBAVmlld0NoaWxkKCdidXR0b24nLCB7IHN0YXRpYzogZmFsc2UgfSlcbiAgc2V0IGJ1dHRvbihidXR0b246IEVsZW1lbnRSZWY8SFRNTEVsZW1lbnQ+IHwgdW5kZWZpbmVkKSB7XG4gICAgLy8gTm90ZTogYHJ1bk91dHNpZGVBbmd1bGFyYCBpcyB1c2VkIHRvIHRyaWdnZXIgYGFkZEV2ZW50TGlzdGVuZXJgIG91dHNpZGUgb2YgdGhlIEFuZ3VsYXIgem9uZVxuICAgIC8vICAgICAgIHRvby4gU2VlIGBzZXR1cE1vdXNlRW50ZXJMaXN0ZW5lcmAuIFRoZSBgc3dpdGNoTWFwYCB3aWxsIHN1YnNjcmliZSB0byBgZnJvbUV2ZW50YCBjb25zaWRlcmluZ1xuICAgIC8vICAgICAgIHRoZSBjb250ZXh0IHdoZXJlIHRoZSBmYWN0b3J5IGlzIGNhbGxlZCBpbi5cbiAgICB0aGlzLm5nWm9uZS5ydW5PdXRzaWRlQW5ndWxhcigoKSA9PiB0aGlzLmJ1dHRvbiQubmV4dChidXR0b24/Lm5hdGl2ZUVsZW1lbnQpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgc3ViamVjdCB1c2VkIHRvIGVtaXQgd2hlbmV2ZXIgdmlldyBxdWVyaWVzIGFyZSBydW4gYW5kIGBidXR0b25gIG9yIGBzcGFuYCBpcyBzZXQvcmVtb3ZlZC5cbiAgICogV2UgdXNlIHN1YmplY3QgdG8ga2VlcCB0aGUgcmVhY3RpdmUgYmVoYXZpb3Igc28gd2UgZG9uJ3QgaGF2ZSB0byBhZGQgYW5kIHJlbW92ZSBldmVudCBsaXN0ZW5lcnMgbWFudWFsbHkuXG4gICAqL1xuICBwcml2YXRlIHJlYWRvbmx5IGJ1dHRvbiQgPSBuZXcgU3ViamVjdDxIVE1MRWxlbWVudCB8IHVuZGVmaW5lZD4oKTtcblxuICBwcml2YXRlIHJlYWRvbmx5IGRlc3Ryb3kkID0gbmV3IFN1YmplY3Q8dm9pZD4oKTtcblxuICBwcml2YXRlIHJlYWRvbmx5IG5nWm9uZSA9IGluamVjdChOZ1pvbmUpO1xuICBwcml2YXRlIHJlYWRvbmx5IGVtb2ppU2VydmljZSA9IGluamVjdChFbW9qaVNlcnZpY2UpO1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuc2V0dXBNb3VzZUxpc3RlbmVycygpO1xuICB9XG5cblxudW5pZmllZFRleHQ/OiBzdHJpbmcgfCBudWxsID0gbnVsbDtcbiAgZmx1ZW50VXJsOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcblxuICBuZ09uQ2hhbmdlcygpIHtcbiAgICBpZiAoIXRoaXMuZW1vamkpIHtcbiAgICAgIHJldHVybiAodGhpcy5pc1Zpc2libGUgPSBmYWxzZSk7XG4gICAgfVxuICAgIGNvbnN0IGRhdGEgPSB0aGlzLmdldERhdGEoKTtcbiAgICBpZiAoIWRhdGEpIHtcbiAgICAgIHJldHVybiAodGhpcy5pc1Zpc2libGUgPSBmYWxzZSk7XG4gICAgfVxuXG4gICAgdGhpcy51bmlmaWVkVGV4dCA9IGRhdGEubmF0aXZlIHx8IG51bGw7XG4gICAgaWYgKGRhdGEuY3VzdG9tKSB7XG4gICAgICB0aGlzLmN1c3RvbSA9IGRhdGEuY3VzdG9tO1xuICAgIH1cbiAgICBpZiAoIWRhdGEudW5pZmllZCAmJiAhZGF0YS5jdXN0b20pIHtcbiAgICAgIHJldHVybiAodGhpcy5pc1Zpc2libGUgPSBmYWxzZSk7XG4gICAgfVxuICAgIGlmICh0aGlzLnRvb2x0aXApIHtcbiAgICAgIHRoaXMudGl0bGUgPSBkYXRhLnNob3J0TmFtZXNbMF07XG4gICAgfVxuICAgIGlmIChkYXRhLm9ic29sZXRlZEJ5ICYmIHRoaXMuaGlkZU9ic29sZXRlKSB7XG4gICAgICByZXR1cm4gKHRoaXMuaXNWaXNpYmxlID0gZmFsc2UpO1xuICAgIH1cblxuICAgIHRoaXMubGFiZWwgPSBbZGF0YS5uYXRpdmVdLmNvbmNhdChkYXRhLnNob3J0TmFtZXMpLmZpbHRlcihCb29sZWFuKS5qb2luKCcsICcpO1xuXG4gICAgLy8gVmVyaWZpY2Ftb3Mgc2kgZXMgdW5hIGZhbWlsaWEgY29tcGxlamEgY29uIFpXSiBxdWUgc2FiZW1vcyBxdWUgbm8gdGllbmUgYXNzZXRcbiAgICBjb25zdCBpc0NvbXBsZXhGYW1pbHkgPSBkYXRhLnVuaWZpZWQgJiYgZGF0YS51bmlmaWVkLmluY2x1ZGVzKCcyMDBkJyk7XG5cbiAgICBpZiAoZGF0YS51bmlmaWVkICYmICFpc0NvbXBsZXhGYW1pbHkpIHtcbiAgICAgIGNvbnN0IGNvZGlnb1VuaWZpY2FkbyA9IGRhdGEudW5pZmllZC50b0xvd2VyQ2FzZSgpO1xuICAgICAgdGhpcy5mbHVlbnRVcmwgPSBgYXNzZXRzL2ZsdWVudC1lbW9qaS8ke2NvZGlnb1VuaWZpY2Fkb30ud2VicGA7XG4gICAgICB0aGlzLmlzTmF0aXZlID0gZmFsc2U7XG4gICAgICB0aGlzLnN0eWxlID0ge1xuICAgICAgICB3aWR0aDogYCR7dGhpcy5zaXplfXB4YCxcbiAgICAgICAgaGVpZ2h0OiBgJHt0aGlzLnNpemV9cHhgLFxuICAgICAgICBkaXNwbGF5OiAnaW5saW5lLWJsb2NrJyxcbiAgICAgICAgYmFja2dyb3VuZEltYWdlOiBgdXJsKCR7dGhpcy5mbHVlbnRVcmx9KWAsXG4gICAgICAgIGJhY2tncm91bmRTaXplOiAnY29udGFpbicsXG4gICAgICAgIGJhY2tncm91bmRSZXBlYXQ6ICduby1yZXBlYXQnLFxuICAgICAgICBiYWNrZ3JvdW5kUG9zaXRpb246ICdjZW50ZXInLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRmFsbGJhY2sgbmF0aXZvIGlubWVkaWF0byBwYXJhIGNhc29zIGNvbXBsZWpvc1xuICAgICAgdGhpcy5pc05hdGl2ZSA9IHRydWU7XG4gICAgICB0aGlzLmZsdWVudFVybCA9IG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuICh0aGlzLmlzVmlzaWJsZSA9IHRydWUpO1xuICB9XG5cblxuXG5wcml2YXRlIGlzTWlzc2luZ0Fzc2V0KHVuaWZpZWQ/OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBpZiAoIXVuaWZpZWQpIHJldHVybiB0cnVlO1xuICAgIGNvbnN0IGxvd2VyVW5pZmllZCA9IHVuaWZpZWQudG9Mb3dlckNhc2UoKTtcblxuICAgIC8vIExpc3RhZG8gZXhhY3RvIGRlIGxvcyB1bmlmaWNhZG9zIHF1ZSBzYWJlbW9zIHF1ZSBubyB0aWVuZW4gLndlYnAgbG9jYWxcbiAgICBjb25zdCBtaXNzaW5nQXNzZXRzID0gbmV3IFNldChbXG4gICAgICAnMWY0NjgtMjAwZC0xZjQ2OC0yMDBkLTFmNDY3LTIwMGQtMWY0NjYnLFxuICAgICAgJzFmNDY5LTIwMGQtMWY0NjktMjAwZC0xZjQ2Ny0yMDBkLTFmNDY2JyxcbiAgICAgICcxZjFlNy0xZjFmMScsXG4gICAgICAnMWYxZTctMWYxZjYnLFxuICAgICAgJzFmMWU3LTFmMWZiJyxcbiAgICAgICcxZjFlOC0xZjFmNScsXG4gICAgICAnMWYxZTktMWYxZWMnLFxuICAgICAgJzFmMWVhLTFmMWU2JyxcbiAgICAgICcxZjFmMi0xZjFlYicsXG4gICAgICAnMWYxZWQtMWYxZjInLFxuICAgICAgJzFmMWY3LTFmMWVhJyxcbiAgICAgICcxZjFmOC0xZjFlZicsXG4gICAgICAnMWYxZjktMWYxZTknLFxuICAgICAgJzFmMWY5LTFmMWViJyxcbiAgICAgICcxZjFmYS0xZjFmMicsXG4gICAgICAnMWYzZjQtZTAwNjctZTAwNjItZTAwNjUtZTAwNmUtZTAwNjctZTAwN2YnLCAvLyBJbmdsYXRlcnJhXG4gICAgICAnMWYzZjQtZTAwNjctZTAwNjItZTAwNzMtZTAwNjMtZTAwNzQtZTAwN2YnLCAvLyBFc2NvY2lhXG4gICAgICAnMWYzZjQtZTAwNjctZTAwNjItZTAwNzctZTAwNmMtZTAwNzMtZTAwN2YnICAvLyBHYWxlc1xuICAgIF0pO1xuXG4gICAgaWYgKG1pc3NpbmdBc3NldHMuaGFzKGxvd2VyVW5pZmllZCkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIFBhdHLDs24gZ2Vuw6lyaWNvIHBvciBzaSBhcGFyZWNlIGFsZ3VuYSBvdHJhIHZhcmlhbnRlIGNvbiBaV0pcbiAgICByZXR1cm4gbG93ZXJVbmlmaWVkLmluY2x1ZGVzKCcyMDBkJyk7XG4gIH1cblxuXG4gIG5nT25EZXN0cm95KCk6IHZvaWQge1xuICAgIHRoaXMuZGVzdHJveSQubmV4dCgpO1xuICB9XG5cbiAgZ2V0RGF0YSgpIHtcbiAgICByZXR1cm4gdGhpcy5lbW9qaVNlcnZpY2UuZ2V0RGF0YSh0aGlzLmVtb2ppLCB0aGlzLnNraW4sIHRoaXMuc2V0KTtcbiAgfVxuXG4gIGdldFNhbml0aXplZERhdGEoKTogRW1vamlEYXRhIHtcbiAgICByZXR1cm4gdGhpcy5lbW9qaVNlcnZpY2UuZ2V0U2FuaXRpemVkRGF0YSh0aGlzLmVtb2ppLCB0aGlzLnNraW4sIHRoaXMuc2V0KSBhcyBFbW9qaURhdGE7XG4gIH1cblxuICBwcml2YXRlIHNldHVwTW91c2VMaXN0ZW5lcnMoKTogdm9pZCB7XG4gICAgY29uc3QgZXZlbnRMaXN0ZW5lciQgPSAoZXZlbnROYW1lOiBzdHJpbmcpID0+XG4gICAgICB0aGlzLmJ1dHRvbiQucGlwZShcbiAgICAgICAgLy8gTm90ZTogYEVNUFRZYCBpcyB1c2VkIHRvIHJlbW92ZSBldmVudCBsaXN0ZW5lciBvbmNlIHRoZSBET00gbm9kZSBpcyByZW1vdmVkLlxuICAgICAgICBzd2l0Y2hNYXAoYnV0dG9uID0+IChidXR0b24gPyBmcm9tRXZlbnQoYnV0dG9uLCBldmVudE5hbWUpIDogRU1QVFkpKSxcbiAgICAgICAgdGFrZVVudGlsKHRoaXMuZGVzdHJveSQpLFxuICAgICAgKTtcblxuICAgIGV2ZW50TGlzdGVuZXIkKCdjbGljaycpLnN1YnNjcmliZSgkZXZlbnQgPT4ge1xuICAgICAgY29uc3QgZW1vamkgPSB0aGlzLmdldFNhbml0aXplZERhdGEoKTtcbiAgICAgIHRoaXMuZW1vamlDbGlja091dHNpZGVBbmd1bGFyLmVtaXQoeyBlbW9qaSwgJGV2ZW50IH0pO1xuICAgICAgLy8gTm90ZTogdGhpcyBpcyBkb25lIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eS4gV2UgcnVuIGNoYW5nZSBkZXRlY3Rpb24gaWYgZGV2ZWxvcGVyc1xuICAgICAgLy8gICAgICAgYXJlIGxpc3RlbmluZyB0byBgZW1vamlDbGlja2AgaW4gdGhlaXIgY29kZS4gRm9yIGluc3RhbmNlOlxuICAgICAgLy8gICAgICAgYDxuZ3gtZW1vamkgKGVtb2ppQ2xpY2spPVwiLi4uXCI+PC9uZ3gtZW1vamk+YC5cbiAgICAgIGlmICh0aGlzLmVtb2ppQ2xpY2sub2JzZXJ2ZWQpIHtcbiAgICAgICAgdGhpcy5uZ1pvbmUucnVuKCgpID0+IHRoaXMuZW1vamlDbGljay5lbWl0KHsgZW1vamksICRldmVudCB9KSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBldmVudExpc3RlbmVyJCgnbW91c2VlbnRlcicpLnN1YnNjcmliZSgkZXZlbnQgPT4ge1xuICAgICAgY29uc3QgZW1vamkgPSB0aGlzLmdldFNhbml0aXplZERhdGEoKTtcbiAgICAgIHRoaXMuZW1vamlPdmVyT3V0c2lkZUFuZ3VsYXIuZW1pdCh7IGVtb2ppLCAkZXZlbnQgfSk7XG4gICAgICAvLyBOb3RlOiB0aGlzIGlzIGRvbmUgZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5LiBXZSBydW4gY2hhbmdlIGRldGVjdGlvbiBpZiBkZXZlbG9wZXJzXG4gICAgICAvLyAgICAgICBhcmUgbGlzdGVuaW5nIHRvIGBlbW9qaU92ZXJgIGluIHRoZWlyIGNvZGUuIEZvciBpbnN0YW5jZTpcbiAgICAgIC8vICAgICAgIGA8bmd4LWVtb2ppIChlbW9qaU92ZXIpPVwiLi4uXCI+PC9uZ3gtZW1vamk+YC5cbiAgICAgIGlmICh0aGlzLmVtb2ppT3Zlci5vYnNlcnZlZCkge1xuICAgICAgICB0aGlzLm5nWm9uZS5ydW4oKCkgPT4gdGhpcy5lbW9qaU92ZXIuZW1pdCh7IGVtb2ppLCAkZXZlbnQgfSkpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgZXZlbnRMaXN0ZW5lciQoJ21vdXNlbGVhdmUnKS5zdWJzY3JpYmUoJGV2ZW50ID0+IHtcbiAgICAgIGNvbnN0IGVtb2ppID0gdGhpcy5nZXRTYW5pdGl6ZWREYXRhKCk7XG4gICAgICB0aGlzLmVtb2ppTGVhdmVPdXRzaWRlQW5ndWxhci5lbWl0KHsgZW1vamksICRldmVudCB9KTtcbiAgICAgIC8vIE5vdGU6IHRoaXMgaXMgZG9uZSBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkuIFdlIHJ1biBjaGFuZ2UgZGV0ZWN0aW9uIGlmIGRldmVsb3BlcnNcbiAgICAgIC8vICAgICAgIGFyZSBsaXN0ZW5pbmcgdG8gYGVtb2ppTGVhdmVgIGluIHRoZWlyIGNvZGUuIEZvciBpbnN0YW5jZTpcbiAgICAgIC8vICAgICAgIGA8bmd4LWVtb2ppIChlbW9qaUxlYXZlKT1cIi4uLlwiPjwvbmd4LWVtb2ppPmAuXG4gICAgICBpZiAodGhpcy5lbW9qaUxlYXZlLm9ic2VydmVkKSB7XG4gICAgICAgIHRoaXMubmdab25lLnJ1bigoKSA9PiB0aGlzLmVtb2ppTGVhdmUuZW1pdCh7IGVtb2ppLCAkZXZlbnQgfSkpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG4iXX0=