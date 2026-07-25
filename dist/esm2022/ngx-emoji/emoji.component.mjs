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
        if (data.unified && !isComplexFamily && !this.isMissingAsset(data.unified)) {
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
        return false;
        // Patrón genérico por si aparece alguna otra variante con ZWJ
        //return lowerUnified.includes('200d');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1vamkuY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9waWNrZXIvbmd4LWVtb2ppL2Vtb2ppLmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxpQkFBaUI7QUFDakIsT0FBTyxFQUNMLHVCQUF1QixFQUN2QixTQUFTLEVBRVQsWUFBWSxFQUNaLEtBQUssRUFDTCxNQUFNLEVBR04sTUFBTSxFQUNOLFNBQVMsRUFDVCxNQUFNLEdBQ1AsTUFBTSxlQUFlLENBQUM7QUFDdkIsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBR3ZFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxZQUFZLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQzs7O0FBMEJyRSxNQThDYSxjQUFjO0lBRXpCLElBQUksY0FBYztRQUNoQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDNUIsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPO1lBQUUsT0FBTyxJQUFJLENBQUM7UUFDeEMsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNuRCxPQUFPLHVCQUF1QixlQUFlLE9BQU8sQ0FBQztJQUN2RCxDQUFDO0lBRUQsSUFBSSxnQkFBZ0I7UUFDbEIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQztRQUNoQyxJQUFJLENBQUMsR0FBRztZQUFFLE9BQU8sSUFBSSxDQUFDO1FBQ3RCLE9BQU87WUFDTCxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxJQUFJO1lBQ3ZCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLElBQUk7WUFDeEIsT0FB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QVEsRUFBRTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FzQ1Q7b0JBQ0QsZUFBZSxFQUFFLHVCQUF1QixDQUFDLE1BQU07b0JBQy9DLG1CQUFtQixFQUFFLEtBQUs7b0JBQzFCLFVBQVUsRUFBRSxJQUFJO29CQUNoQixPQUFPLEVBQUUsQ0FBQyxZQUFZLENBQUM7aUJBQ3hCOzBFQXlCVSxJQUFJO3NCQUFaLEtBQUs7Z0JBQ0csR0FBRztzQkFBWCxLQUFLO2dCQUNHLFNBQVM7c0JBQWpCLEtBQUs7Z0JBRUcsUUFBUTtzQkFBaEIsS0FBSztnQkFDRyxTQUFTO3NCQUFqQixLQUFLO2dCQUNHLE9BQU87c0JBQWYsS0FBSztnQkFDRyxJQUFJO3NCQUFaLEtBQUs7Z0JBQ0csS0FBSztzQkFBYixLQUFLO2dCQUNHLFFBQVE7c0JBQWhCLEtBQUs7Z0JBQ0csWUFBWTtzQkFBcEIsS0FBSztnQkFDRyxTQUFTO3NCQUFqQixLQUFLO2dCQUNHLFlBQVk7c0JBQXBCLEtBQUs7Z0JBQ0csU0FBUztzQkFBakIsS0FBSztnQkFPSSxTQUFTO3NCQUFsQixNQUFNO2dCQUNHLHVCQUF1QjtzQkFBaEMsTUFBTTtnQkFFRyxVQUFVO3NCQUFuQixNQUFNO2dCQUNHLHdCQUF3QjtzQkFBakMsTUFBTTtnQkFDRyxVQUFVO3NCQUFuQixNQUFNO2dCQUNHLHdCQUF3QjtzQkFBakMsTUFBTTtnQkFTRSxpQkFBaUI7c0JBQXpCLEtBQUs7Z0JBQ0csVUFBVTtzQkFBbEIsS0FBSztnQkFHRixNQUFNO3NCQURULFNBQVM7dUJBQUMsUUFBUSxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSIsInNvdXJjZXNDb250ZW50IjpbIi8vIG1vZGlmaWNhY2lvbiA3XG5pbXBvcnQge1xuICBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneSxcbiAgQ29tcG9uZW50LFxuICBFbGVtZW50UmVmLFxuICBFdmVudEVtaXR0ZXIsXG4gIElucHV0LFxuICBOZ1pvbmUsXG4gIE9uQ2hhbmdlcyxcbiAgT25EZXN0cm95LFxuICBPdXRwdXQsXG4gIFZpZXdDaGlsZCxcbiAgaW5qZWN0LFxufSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IENvbW1vbk1vZHVsZSB9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQgeyBFTVBUWSwgU3ViamVjdCwgZnJvbUV2ZW50LCBzd2l0Y2hNYXAsIHRha2VVbnRpbCB9IGZyb20gJ3J4anMnO1xuXG5pbXBvcnQgeyBFbW9qaURhdGEgfSBmcm9tICcuL2RhdGEvZGF0YS5pbnRlcmZhY2VzJztcbmltcG9ydCB7IERFRkFVTFRfQkFDS0dST1VOREZOLCBFbW9qaVNlcnZpY2UgfSBmcm9tICcuL2Vtb2ppLnNlcnZpY2UnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEVtb2ppIHtcbiAgLyoqIFJlbmRlcnMgdGhlIG5hdGl2ZSB1bmljb2RlIGVtb2ppICovXG4gIGlzTmF0aXZlOiBib29sZWFuO1xuICBmb3JjZVNpemU6IGJvb2xlYW47XG4gIHRvb2x0aXA6IGJvb2xlYW47XG4gIHNraW46IDEgfCAyIHwgMyB8IDQgfCA1IHwgNjtcbiAgc2hlZXRTaXplOiAxNiB8IDIwIHwgMzIgfCA2NCB8IDcyO1xuICBzaGVldFJvd3M/OiBudW1iZXI7XG4gIHNldDogJ2FwcGxlJyB8ICdnb29nbGUnIHwgJ3R3aXR0ZXInIHwgJ2ZhY2Vib29rJyB8ICcnO1xuICBzaXplOiBudW1iZXI7XG4gIGVtb2ppOiBzdHJpbmcgfCBFbW9qaURhdGE7XG4gIGJhY2tncm91bmRJbWFnZUZuOiAoc2V0OiBzdHJpbmcsIHNoZWV0U2l6ZTogbnVtYmVyKSA9PiBzdHJpbmc7XG4gIGZhbGxiYWNrPzogKGRhdGE6IGFueSwgcHJvcHM6IGFueSkgPT4gc3RyaW5nO1xuICBlbW9qaU92ZXI6IEV2ZW50RW1pdHRlcjxFbW9qaUV2ZW50PjtcbiAgZW1vamlMZWF2ZTogRXZlbnRFbWl0dGVyPEVtb2ppRXZlbnQ+O1xuICBlbW9qaUNsaWNrOiBFdmVudEVtaXR0ZXI8RW1vamlFdmVudD47XG4gIGltYWdlVXJsRm4/OiAoZW1vamk6IEVtb2ppRGF0YSB8IG51bGwpID0+IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBFbW9qaUV2ZW50IHtcbiAgZW1vamk6IEVtb2ppRGF0YTtcbiAgJGV2ZW50OiBFdmVudDtcbn1cblxuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAnbmd4LWVtb2ppJyxcbiAgdGVtcGxhdGU6IGBcbiAgICA8bmctdGVtcGxhdGUgW25nSWZdPVwiaXNWaXNpYmxlXCI+XG4gICAgICA8YnV0dG9uXG4gICAgICAgICpuZ0lmPVwidXNlQnV0dG9uOyBlbHNlIHNwYW5UcGxcIlxuICAgICAgICAjYnV0dG9uXG4gICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICBbYXR0ci50aXRsZV09XCJ0aXRsZVwiXG4gICAgICAgIFthdHRyLmFyaWEtbGFiZWxdPVwibGFiZWxcIlxuICAgICAgICBjbGFzcz1cImVtb2ppLW1hcnQtZW1vamlcIlxuICAgICAgICBbY2xhc3MuZW1vamktbWFydC1lbW9qaS1uYXRpdmVdPVwiaXNOYXRpdmVcIlxuICAgICAgICBbY2xhc3MuZW1vamktbWFydC1lbW9qaS1jdXN0b21dPVwiY3VzdG9tXCJcbiAgICAgID5cbiAgICAgICAgPHNwYW4gc3R5bGU9XCJkaXNwbGF5OiBmbGV4OyBhbGlnbi1pdGVtczogY2VudGVyOyBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjsgd2lkdGg6IDEwMCU7IGhlaWdodDogMTAwJTtcIj5cbiAgICAgICAgICA8c3BhbiAqbmdJZj1cIiFpc05hdGl2ZSAmJiBmbHVlbnRVcmw7IGVsc2UgbmF0aXZlVGV4dFwiIFtuZ1N0eWxlXT1cInN0eWxlXCI+PC9zcGFuPlxuICAgICAgICAgIDxuZy10ZW1wbGF0ZSAjbmF0aXZlVGV4dD5cbiAgICAgICAgICAgIDxzcGFuIFtzdHlsZS5mb250LXNpemUucHhdPVwic2l6ZVwiPnt7IHVuaWZpZWRUZXh0IH19PC9zcGFuPlxuICAgICAgICAgIDwvbmctdGVtcGxhdGU+XG4gICAgICAgIDwvc3Bhbj5cbiAgICAgIDwvYnV0dG9uPlxuICAgIDwvbmctdGVtcGxhdGU+XG5cbiAgICA8bmctdGVtcGxhdGUgI3NwYW5UcGw+XG4gICAgICA8c3BhblxuICAgICAgICAjYnV0dG9uXG4gICAgICAgIFthdHRyLnRpdGxlXT1cInRpdGxlXCJcbiAgICAgICAgW2F0dHIuYXJpYS1sYWJlbF09XCJsYWJlbFwiXG4gICAgICAgIGNsYXNzPVwiZW1vamktbWFydC1lbW9qaVwiXG4gICAgICAgIFtjbGFzcy5lbW9qaS1tYXJ0LWVtb2ppLW5hdGl2ZV09XCJpc05hdGl2ZVwiXG4gICAgICAgIFtjbGFzcy5lbW9qaS1tYXJ0LWVtb2ppLWN1c3RvbV09XCJjdXN0b21cIlxuICAgICAgPlxuICAgICAgICA8c3BhbiBzdHlsZT1cImRpc3BsYXk6IGZsZXg7IGFsaWduLWl0ZW1zOiBjZW50ZXI7IGp1c3RpZnktY29udGVudDogY2VudGVyOyB3aWR0aDogMTAwJTsgaGVpZ2h0OiAxMDAlO1wiPlxuICAgICAgICAgIDxzcGFuICpuZ0lmPVwiIWlzTmF0aXZlICYmIGZsdWVudFVybDsgZWxzZSBuYXRpdmVUZXh0XCIgW25nU3R5bGVdPVwic3R5bGVcIj48L3NwYW4+XG4gICAgICAgICAgPG5nLXRlbXBsYXRlICNuYXRpdmVUZXh0PlxuICAgICAgICAgICAgPHNwYW4gW3N0eWxlLmZvbnQtc2l6ZS5weF09XCJzaXplXCI+e3sgdW5pZmllZFRleHQgfX08L3NwYW4+XG4gICAgICAgICAgPC9uZy10ZW1wbGF0ZT5cbiAgICAgICAgPC9zcGFuPlxuICAgICAgPC9zcGFuPlxuICAgIDwvbmctdGVtcGxhdGU+XG4gIGAsXG4gIGNoYW5nZURldGVjdGlvbjogQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kuT25QdXNoLFxuICBwcmVzZXJ2ZVdoaXRlc3BhY2VzOiBmYWxzZSxcbiAgc3RhbmRhbG9uZTogdHJ1ZSxcbiAgaW1wb3J0czogW0NvbW1vbk1vZHVsZV0sXG59KVxuZXhwb3J0IGNsYXNzIEVtb2ppQ29tcG9uZW50IGltcGxlbWVudHMgT25DaGFuZ2VzLCBFbW9qaSwgT25EZXN0cm95IHtcblxuICBnZXQgZmx1ZW50RW1vamlVcmwoKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgY29uc3QgZGF0YSA9IHRoaXMuZ2V0RGF0YSgpO1xuICAgIGlmICghZGF0YSB8fCAhZGF0YS51bmlmaWVkKSByZXR1cm4gbnVsbDtcbiAgICBjb25zdCBjb2RpZ29VbmlmaWNhZG8gPSBkYXRhLnVuaWZpZWQudG9Mb3dlckNhc2UoKTtcbiAgICByZXR1cm4gYGFzc2V0cy9mbHVlbnQtZW1vamkvJHtjb2RpZ29VbmlmaWNhZG99LndlYnBgO1xuICB9XG5cbiAgZ2V0IGZsdWVudEVtb2ppU3R5bGUoKTogYW55IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmZsdWVudEVtb2ppVXJsO1xuICAgIGlmICghdXJsKSByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4ge1xuICAgICAgd2lkdGg6IGAke3RoaXMuc2l6ZX1weGAsXG4gICAgICBoZWlnaHQ6IGAke3RoaXMuc2l6ZX1weGAsXG4gICAgICBkaXNwbGF5OiAnaW5saW5lLWJsb2NrJyxcbiAgICAgIGJhY2tncm91bmRJbWFnZTogYHVybCgke3VybH0pYCxcbiAgICAgIGJhY2tncm91bmRTaXplOiAnY29udGFpbicsXG4gICAgICBiYWNrZ3JvdW5kUmVwZWF0OiAnbm8tcmVwZWF0JyxcbiAgICAgIGJhY2tncm91bmRQb3NpdGlvbjogJ2NlbnRlcicsXG4gICAgfTtcbiAgfVxuXG5cbiAgQElucHV0KCkgc2tpbjogRW1vamlbJ3NraW4nXSA9IDE7XG4gIEBJbnB1dCgpIHNldDogRW1vamlbJ3NldCddID0gJ2FwcGxlJztcbiAgQElucHV0KCkgc2hlZXRTaXplOiBFbW9qaVsnc2hlZXRTaXplJ10gPSA2NDtcbiAgLyoqIFJlbmRlcnMgdGhlIG5hdGl2ZSB1bmljb2RlIGVtb2ppICovXG4gIEBJbnB1dCgpIGlzTmF0aXZlOiBFbW9qaVsnaXNOYXRpdmUnXSA9IGZhbHNlO1xuICBASW5wdXQoKSBmb3JjZVNpemU6IEVtb2ppWydmb3JjZVNpemUnXSA9IGZhbHNlO1xuICBASW5wdXQoKSB0b29sdGlwOiBFbW9qaVsndG9vbHRpcCddID0gZmFsc2U7XG4gIEBJbnB1dCgpIHNpemU6IEVtb2ppWydzaXplJ10gPSAyNDtcbiAgQElucHV0KCkgZW1vamk6IEVtb2ppWydlbW9qaSddID0gJyc7XG4gIEBJbnB1dCgpIGZhbGxiYWNrPzogRW1vamlbJ2ZhbGxiYWNrJ107XG4gIEBJbnB1dCgpIGhpZGVPYnNvbGV0ZSA9IGZhbHNlO1xuICBASW5wdXQoKSBzaGVldFJvd3M/OiBudW1iZXI7XG4gIEBJbnB1dCgpIHNoZWV0Q29sdW1ucz86IG51bWJlcjtcbiAgQElucHV0KCkgdXNlQnV0dG9uPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIE5vdGU6IGBlbW9qaU92ZXJgIGFuZCBgZW1vamlPdmVyT3V0c2lkZUFuZ3VsYXJgIGFyZSBkaXNwYXRjaGVkIG9uIHRoZSBzYW1lIGV2ZW50IChgbW91c2VlbnRlcmApLCBidXRcbiAgICogICAgICAgZm9yIGRpZmZlcmVudCBwdXJwb3Nlcy4gVGhlIGBlbW9qaU92ZXJPdXRzaWRlQW5ndWxhcmAgZXZlbnQgaXMgbGlzdGVuZWQgb25seSBpbiBgZW1vamktY2F0ZWdvcnlgXG4gICAqICAgICAgIGNvbXBvbmVudCBhbmQgdGhlIGNhdGVnb3J5IGNvbXBvbmVudCBkb2Vzbid0IGNhcmUgYWJvdXQgem9uZSBjb250ZXh0IHRoZSBjYWxsYmFjayBpcyBiZWluZyBjYWxsZWQgaW4uXG4gICAqICAgICAgIFRoZSBgZW1vamlPdmVyYCBpcyBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkgaWYgYW55b25lIGlzIGxpc3RlbmluZyB0byB0aGlzIGV2ZW50IGV4cGxpY2l0bHkgaW4gdGhlaXIgY29kZS5cbiAgICovXG4gIEBPdXRwdXQoKSBlbW9qaU92ZXI6IEVtb2ppWydlbW9qaU92ZXInXSA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgQE91dHB1dCgpIGVtb2ppT3Zlck91dHNpZGVBbmd1bGFyOiBFbW9qaVsnZW1vamlPdmVyJ10gPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gIC8qKiBTZWUgY29tbWVudHMgYWJvdmUsIHRoaXMgc2VydmVzIHRoZSBzYW1lIHB1cnBvc2UuICovXG4gIEBPdXRwdXQoKSBlbW9qaUxlYXZlOiBFbW9qaVsnZW1vamlMZWF2ZSddID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICBAT3V0cHV0KCkgZW1vamlMZWF2ZU91dHNpZGVBbmd1bGFyOiBFbW9qaVsnZW1vamlMZWF2ZSddID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICBAT3V0cHV0KCkgZW1vamlDbGljazogRW1vamlbJ2Vtb2ppQ2xpY2snXSA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgQE91dHB1dCgpIGVtb2ppQ2xpY2tPdXRzaWRlQW5ndWxhcjogRW1vamlbJ2Vtb2ppQ2xpY2snXSA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcblxuICBzdHlsZTogYW55O1xuICB0aXRsZT86IHN0cmluZyA9IHVuZGVmaW5lZDtcbiAgbGFiZWwgPSAnJztcbiAgdW5pZmllZD86IHN0cmluZyB8IG51bGw7XG4gIGN1c3RvbSA9IGZhbHNlO1xuICBpc1Zpc2libGUgPSB0cnVlO1xuICAvLyBUT0RPOiByZXBsYWNlIDQuMC4zIHcvIGR5bmFtaWMgZ2V0IHZlcmlzb24gZnJvbSBlbW9qaS1kYXRhc291cmNlIGluIHBhY2thZ2UuanNvblxuICBASW5wdXQoKSBiYWNrZ3JvdW5kSW1hZ2VGbjogRW1vamlbJ2JhY2tncm91bmRJbWFnZUZuJ10gPSBERUZBVUxUX0JBQ0tHUk9VTkRGTjtcbiAgQElucHV0KCkgaW1hZ2VVcmxGbj86IEVtb2ppWydpbWFnZVVybEZuJ107XG5cbiAgQFZpZXdDaGlsZCgnYnV0dG9uJywgeyBzdGF0aWM6IGZhbHNlIH0pXG4gIHNldCBidXR0b24oYnV0dG9uOiBFbGVtZW50UmVmPEhUTUxFbGVtZW50PiB8IHVuZGVmaW5lZCkge1xuICAgIC8vIE5vdGU6IGBydW5PdXRzaWRlQW5ndWxhcmAgaXMgdXNlZCB0byB0cmlnZ2VyIGBhZGRFdmVudExpc3RlbmVyYCBvdXRzaWRlIG9mIHRoZSBBbmd1bGFyIHpvbmVcbiAgICAvLyAgICAgICB0b28uIFNlZSBgc2V0dXBNb3VzZUVudGVyTGlzdGVuZXJgLiBUaGUgYHN3aXRjaE1hcGAgd2lsbCBzdWJzY3JpYmUgdG8gYGZyb21FdmVudGAgY29uc2lkZXJpbmdcbiAgICAvLyAgICAgICB0aGUgY29udGV4dCB3aGVyZSB0aGUgZmFjdG9yeSBpcyBjYWxsZWQgaW4uXG4gICAgdGhpcy5uZ1pvbmUucnVuT3V0c2lkZUFuZ3VsYXIoKCkgPT4gdGhpcy5idXR0b24kLm5leHQoYnV0dG9uPy5uYXRpdmVFbGVtZW50KSk7XG4gIH1cblxuICAvKipcbiAgICogVGhlIHN1YmplY3QgdXNlZCB0byBlbWl0IHdoZW5ldmVyIHZpZXcgcXVlcmllcyBhcmUgcnVuIGFuZCBgYnV0dG9uYCBvciBgc3BhbmAgaXMgc2V0L3JlbW92ZWQuXG4gICAqIFdlIHVzZSBzdWJqZWN0IHRvIGtlZXAgdGhlIHJlYWN0aXZlIGJlaGF2aW9yIHNvIHdlIGRvbid0IGhhdmUgdG8gYWRkIGFuZCByZW1vdmUgZXZlbnQgbGlzdGVuZXJzIG1hbnVhbGx5LlxuICAgKi9cbiAgcHJpdmF0ZSByZWFkb25seSBidXR0b24kID0gbmV3IFN1YmplY3Q8SFRNTEVsZW1lbnQgfCB1bmRlZmluZWQ+KCk7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBkZXN0cm95JCA9IG5ldyBTdWJqZWN0PHZvaWQ+KCk7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBuZ1pvbmUgPSBpbmplY3QoTmdab25lKTtcbiAgcHJpdmF0ZSByZWFkb25seSBlbW9qaVNlcnZpY2UgPSBpbmplY3QoRW1vamlTZXJ2aWNlKTtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLnNldHVwTW91c2VMaXN0ZW5lcnMoKTtcbiAgfVxuXG5cbnVuaWZpZWRUZXh0Pzogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gIGZsdWVudFVybDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG5cbiAgbmdPbkNoYW5nZXMoKSB7XG4gICAgaWYgKCF0aGlzLmVtb2ppKSB7XG4gICAgICByZXR1cm4gKHRoaXMuaXNWaXNpYmxlID0gZmFsc2UpO1xuICAgIH1cbiAgICBjb25zdCBkYXRhID0gdGhpcy5nZXREYXRhKCk7XG4gICAgaWYgKCFkYXRhKSB7XG4gICAgICByZXR1cm4gKHRoaXMuaXNWaXNpYmxlID0gZmFsc2UpO1xuICAgIH1cblxuICAgIHRoaXMudW5pZmllZFRleHQgPSBkYXRhLm5hdGl2ZSB8fCBudWxsO1xuICAgIGlmIChkYXRhLmN1c3RvbSkge1xuICAgICAgdGhpcy5jdXN0b20gPSBkYXRhLmN1c3RvbTtcbiAgICB9XG4gICAgaWYgKCFkYXRhLnVuaWZpZWQgJiYgIWRhdGEuY3VzdG9tKSB7XG4gICAgICByZXR1cm4gKHRoaXMuaXNWaXNpYmxlID0gZmFsc2UpO1xuICAgIH1cbiAgICBpZiAodGhpcy50b29sdGlwKSB7XG4gICAgICB0aGlzLnRpdGxlID0gZGF0YS5zaG9ydE5hbWVzWzBdO1xuICAgIH1cbiAgICBpZiAoZGF0YS5vYnNvbGV0ZWRCeSAmJiB0aGlzLmhpZGVPYnNvbGV0ZSkge1xuICAgICAgcmV0dXJuICh0aGlzLmlzVmlzaWJsZSA9IGZhbHNlKTtcbiAgICB9XG5cbiAgICB0aGlzLmxhYmVsID0gW2RhdGEubmF0aXZlXS5jb25jYXQoZGF0YS5zaG9ydE5hbWVzKS5maWx0ZXIoQm9vbGVhbikuam9pbignLCAnKTtcblxuICAgIC8vIFZlcmlmaWNhbW9zIHNpIGVzIHVuYSBmYW1pbGlhIGNvbXBsZWphIGNvbiBaV0ogcXVlIHNhYmVtb3MgcXVlIG5vIHRpZW5lIGFzc2V0XG4gICAgY29uc3QgaXNDb21wbGV4RmFtaWx5ID0gZGF0YS51bmlmaWVkICYmIGRhdGEudW5pZmllZC5pbmNsdWRlcygnMjAwZCcpO1xuXG4gICAgaWYgKGRhdGEudW5pZmllZCAmJiAhaXNDb21wbGV4RmFtaWx5ICYmICF0aGlzLmlzTWlzc2luZ0Fzc2V0KGRhdGEudW5pZmllZCkpIHtcbiAgICAgIGNvbnN0IGNvZGlnb1VuaWZpY2FkbyA9IGRhdGEudW5pZmllZC50b0xvd2VyQ2FzZSgpO1xuICAgICAgdGhpcy5mbHVlbnRVcmwgPSBgYXNzZXRzL2ZsdWVudC1lbW9qaS8ke2NvZGlnb1VuaWZpY2Fkb30ud2VicGA7XG4gICAgICB0aGlzLmlzTmF0aXZlID0gZmFsc2U7XG4gICAgICB0aGlzLnN0eWxlID0ge1xuICAgICAgICB3aWR0aDogYCR7dGhpcy5zaXplfXB4YCxcbiAgICAgICAgaGVpZ2h0OiBgJHt0aGlzLnNpemV9cHhgLFxuICAgICAgICBkaXNwbGF5OiAnaW5saW5lLWJsb2NrJyxcbiAgICAgICAgYmFja2dyb3VuZEltYWdlOiBgdXJsKCR7dGhpcy5mbHVlbnRVcmx9KWAsXG4gICAgICAgIGJhY2tncm91bmRTaXplOiAnY29udGFpbicsXG4gICAgICAgIGJhY2tncm91bmRSZXBlYXQ6ICduby1yZXBlYXQnLFxuICAgICAgICBiYWNrZ3JvdW5kUG9zaXRpb246ICdjZW50ZXInLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRmFsbGJhY2sgbmF0aXZvIGlubWVkaWF0byBwYXJhIGNhc29zIGNvbXBsZWpvc1xuICAgICAgdGhpcy5pc05hdGl2ZSA9IHRydWU7XG4gICAgICB0aGlzLmZsdWVudFVybCA9IG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuICh0aGlzLmlzVmlzaWJsZSA9IHRydWUpO1xuICB9XG5cblxuXG5wcml2YXRlIGlzTWlzc2luZ0Fzc2V0KHVuaWZpZWQ/OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBpZiAoIXVuaWZpZWQpIHJldHVybiB0cnVlO1xuICAgIGNvbnN0IGxvd2VyVW5pZmllZCA9IHVuaWZpZWQudG9Mb3dlckNhc2UoKTtcblxuICAgIC8vIExpc3RhZG8gZXhhY3RvIGRlIGxvcyB1bmlmaWNhZG9zIHF1ZSBzYWJlbW9zIHF1ZSBubyB0aWVuZW4gLndlYnAgbG9jYWxcbiAgICBjb25zdCBtaXNzaW5nQXNzZXRzID0gbmV3IFNldChbXG4gICAgICAnMWY0NjgtMjAwZC0xZjQ2OC0yMDBkLTFmNDY3LTIwMGQtMWY0NjYnLFxuICAgICAgJzFmNDY5LTIwMGQtMWY0NjktMjAwZC0xZjQ2Ny0yMDBkLTFmNDY2JyxcbiAgICAgICcxZjFlNy0xZjFmMScsXG4gICAgICAnMWYxZTctMWYxZjYnLFxuICAgICAgJzFmMWU3LTFmMWZiJyxcbiAgICAgICcxZjFlOC0xZjFmNScsXG4gICAgICAnMWYxZTktMWYxZWMnLFxuICAgICAgJzFmMWVhLTFmMWU2JyxcbiAgICAgICcxZjFmMi0xZjFlYicsXG4gICAgICAnMWYxZWQtMWYxZjInLFxuICAgICAgJzFmMWY3LTFmMWVhJyxcbiAgICAgICcxZjFmOC0xZjFlZicsXG4gICAgICAnMWYxZjktMWYxZTknLFxuICAgICAgJzFmMWY5LTFmMWViJyxcbiAgICAgICcxZjFmYS0xZjFmMicsXG4gICAgICAnMWYzZjQtZTAwNjctZTAwNjItZTAwNjUtZTAwNmUtZTAwNjctZTAwN2YnLCAvLyBJbmdsYXRlcnJhXG4gICAgICAnMWYzZjQtZTAwNjctZTAwNjItZTAwNzMtZTAwNjMtZTAwNzQtZTAwN2YnLCAvLyBFc2NvY2lhXG4gICAgICAnMWYzZjQtZTAwNjctZTAwNjItZTAwNzctZTAwNmMtZTAwNzMtZTAwN2YnICAvLyBHYWxlc1xuICAgIF0pO1xuXG4gICAgaWYgKG1pc3NpbmdBc3NldHMuaGFzKGxvd2VyVW5pZmllZCkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gICAgICAvLyBQYXRyw7NuIGdlbsOpcmljbyBwb3Igc2kgYXBhcmVjZSBhbGd1bmEgb3RyYSB2YXJpYW50ZSBjb24gWldKXG4gICAgICAvL3JldHVybiBsb3dlclVuaWZpZWQuaW5jbHVkZXMoJzIwMGQnKTtcbiAgfVxuXG5cbiAgbmdPbkRlc3Ryb3koKTogdm9pZCB7XG4gICAgdGhpcy5kZXN0cm95JC5uZXh0KCk7XG4gIH1cblxuICBnZXREYXRhKCkge1xuICAgIHJldHVybiB0aGlzLmVtb2ppU2VydmljZS5nZXREYXRhKHRoaXMuZW1vamksIHRoaXMuc2tpbiwgdGhpcy5zZXQpO1xuICB9XG5cbiAgZ2V0U2FuaXRpemVkRGF0YSgpOiBFbW9qaURhdGEge1xuICAgIHJldHVybiB0aGlzLmVtb2ppU2VydmljZS5nZXRTYW5pdGl6ZWREYXRhKHRoaXMuZW1vamksIHRoaXMuc2tpbiwgdGhpcy5zZXQpIGFzIEVtb2ppRGF0YTtcbiAgfVxuXG4gIHByaXZhdGUgc2V0dXBNb3VzZUxpc3RlbmVycygpOiB2b2lkIHtcbiAgICBjb25zdCBldmVudExpc3RlbmVyJCA9IChldmVudE5hbWU6IHN0cmluZykgPT5cbiAgICAgIHRoaXMuYnV0dG9uJC5waXBlKFxuICAgICAgICAvLyBOb3RlOiBgRU1QVFlgIGlzIHVzZWQgdG8gcmVtb3ZlIGV2ZW50IGxpc3RlbmVyIG9uY2UgdGhlIERPTSBub2RlIGlzIHJlbW92ZWQuXG4gICAgICAgIHN3aXRjaE1hcChidXR0b24gPT4gKGJ1dHRvbiA/IGZyb21FdmVudChidXR0b24sIGV2ZW50TmFtZSkgOiBFTVBUWSkpLFxuICAgICAgICB0YWtlVW50aWwodGhpcy5kZXN0cm95JCksXG4gICAgICApO1xuXG4gICAgZXZlbnRMaXN0ZW5lciQoJ2NsaWNrJykuc3Vic2NyaWJlKCRldmVudCA9PiB7XG4gICAgICBjb25zdCBlbW9qaSA9IHRoaXMuZ2V0U2FuaXRpemVkRGF0YSgpO1xuICAgICAgdGhpcy5lbW9qaUNsaWNrT3V0c2lkZUFuZ3VsYXIuZW1pdCh7IGVtb2ppLCAkZXZlbnQgfSk7XG4gICAgICAvLyBOb3RlOiB0aGlzIGlzIGRvbmUgZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5LiBXZSBydW4gY2hhbmdlIGRldGVjdGlvbiBpZiBkZXZlbG9wZXJzXG4gICAgICAvLyAgICAgICBhcmUgbGlzdGVuaW5nIHRvIGBlbW9qaUNsaWNrYCBpbiB0aGVpciBjb2RlLiBGb3IgaW5zdGFuY2U6XG4gICAgICAvLyAgICAgICBgPG5neC1lbW9qaSAoZW1vamlDbGljayk9XCIuLi5cIj48L25neC1lbW9qaT5gLlxuICAgICAgaWYgKHRoaXMuZW1vamlDbGljay5vYnNlcnZlZCkge1xuICAgICAgICB0aGlzLm5nWm9uZS5ydW4oKCkgPT4gdGhpcy5lbW9qaUNsaWNrLmVtaXQoeyBlbW9qaSwgJGV2ZW50IH0pKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGV2ZW50TGlzdGVuZXIkKCdtb3VzZWVudGVyJykuc3Vic2NyaWJlKCRldmVudCA9PiB7XG4gICAgICBjb25zdCBlbW9qaSA9IHRoaXMuZ2V0U2FuaXRpemVkRGF0YSgpO1xuICAgICAgdGhpcy5lbW9qaU92ZXJPdXRzaWRlQW5ndWxhci5lbWl0KHsgZW1vamksICRldmVudCB9KTtcbiAgICAgIC8vIE5vdGU6IHRoaXMgaXMgZG9uZSBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkuIFdlIHJ1biBjaGFuZ2UgZGV0ZWN0aW9uIGlmIGRldmVsb3BlcnNcbiAgICAgIC8vICAgICAgIGFyZSBsaXN0ZW5pbmcgdG8gYGVtb2ppT3ZlcmAgaW4gdGhlaXIgY29kZS4gRm9yIGluc3RhbmNlOlxuICAgICAgLy8gICAgICAgYDxuZ3gtZW1vamkgKGVtb2ppT3Zlcik9XCIuLi5cIj48L25neC1lbW9qaT5gLlxuICAgICAgaWYgKHRoaXMuZW1vamlPdmVyLm9ic2VydmVkKSB7XG4gICAgICAgIHRoaXMubmdab25lLnJ1bigoKSA9PiB0aGlzLmVtb2ppT3Zlci5lbWl0KHsgZW1vamksICRldmVudCB9KSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBldmVudExpc3RlbmVyJCgnbW91c2VsZWF2ZScpLnN1YnNjcmliZSgkZXZlbnQgPT4ge1xuICAgICAgY29uc3QgZW1vamkgPSB0aGlzLmdldFNhbml0aXplZERhdGEoKTtcbiAgICAgIHRoaXMuZW1vamlMZWF2ZU91dHNpZGVBbmd1bGFyLmVtaXQoeyBlbW9qaSwgJGV2ZW50IH0pO1xuICAgICAgLy8gTm90ZTogdGhpcyBpcyBkb25lIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eS4gV2UgcnVuIGNoYW5nZSBkZXRlY3Rpb24gaWYgZGV2ZWxvcGVyc1xuICAgICAgLy8gICAgICAgYXJlIGxpc3RlbmluZyB0byBgZW1vamlMZWF2ZWAgaW4gdGhlaXIgY29kZS4gRm9yIGluc3RhbmNlOlxuICAgICAgLy8gICAgICAgYDxuZ3gtZW1vamkgKGVtb2ppTGVhdmUpPVwiLi4uXCI+PC9uZ3gtZW1vamk+YC5cbiAgICAgIGlmICh0aGlzLmVtb2ppTGVhdmUub2JzZXJ2ZWQpIHtcbiAgICAgICAgdGhpcy5uZ1pvbmUucnVuKCgpID0+IHRoaXMuZW1vamlMZWF2ZS5lbWl0KHsgZW1vamksICRldmVudCB9KSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==