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
        // 1. Familias complejas con ZWJ
        const isComplexFamily = lowerUnified.includes('200d');
        // 2. Banderas nacionales de doble letra (ej. 1f1e7-1f1f1, 1f1e8-1f1f5, etc.)
        const isRegionFlag = /^[1f1e0-1f1ff]-[1f1e0-1f1ff]$/.test(lowerUnified) || lowerUnified.includes('1f1e');
        // 3. Banderas regionales especiales / sub-nacionales (Inglaterra, Escocia, Gales con e00...)
        const isSubNationFlag = lowerUnified.startsWith('1f3f4') || lowerUnified.includes('e00');
        return isComplexFamily || isRegionFlag || isSubNationFlag;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1vamkuY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9waWNrZXIvbmd4LWVtb2ppL2Vtb2ppLmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxpQkFBaUI7QUFDakIsT0FBTyxFQUNMLHVCQUF1QixFQUN2QixTQUFTLEVBRVQsWUFBWSxFQUNaLEtBQUssRUFDTCxNQUFNLEVBR04sTUFBTSxFQUNOLFNBQVMsRUFDVCxNQUFNLEdBQ1AsTUFBTSxlQUFlLENBQUM7QUFDdkIsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBR3ZFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxZQUFZLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQzs7O0FBMEJyRSxNQThDYSxjQUFjO0lBRXpCLElBQUksY0FBYztRQUNoQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDNUIsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPO1lBQUUsT0FBTyxJQUFJLENBQUM7UUFDeEMsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNuRCxPQUFPLHVCQUF1QixlQUFlLE9BQU8sQ0FBQztJQUN2RCxDQUFDO0lBRUQsSUFBSSxnQkFBZ0I7UUFDbEIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQztRQUNoQyxJQUFJLENBQUMsR0FBRztZQUFFLE9BQU8sSUFBSSxDQUFDO1FBQ3RCLE9BQU87WUFDTCxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxJQUFJO1lBQ3ZCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLElBQUk7WUFDeEIsT0FB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QUFVLEVBQUUsSUFBSTtvQkFDaEIsT0FBTyxFQUFFLENBQUMsWUFBWSxDQUFDO2lCQUN4QjswRUF5QlUsSUFBSTtzQkFBWixLQUFLO2dCQUNHLEdBQUc7c0JBQVgsS0FBSztnQkFDRyxTQUFTO3NCQUFqQixLQUFLO2dCQUVHLFFBQVE7c0JBQWhCLEtBQUs7Z0JBQ0csU0FBUztzQkFBakIsS0FBSztnQkFDRyxPQUFPO3NCQUFmLEtBQUs7Z0JBQ0csSUFBSTtzQkFBWixLQUFLO2dCQUNHLEtBQUs7c0JBQWIsS0FBSztnQkFDRyxRQUFRO3NCQUFoQixLQUFLO2dCQUNHLFlBQVk7c0JBQXBCLEtBQUs7Z0JBQ0csU0FBUztzQkFBakIsS0FBSztnQkFDRyxZQUFZO3NCQUFwQixLQUFLO2dCQUNHLFNBQVM7c0JBQWpCLEtBQUs7Z0JBT0ksU0FBUztzQkFBbEIsTUFBTTtnQkFDRyx1QkFBdUI7c0JBQWhDLE1BQU07Z0JBRUcsVUFBVTtzQkFBbkIsTUFBTTtnQkFDRyx3QkFBd0I7c0JBQWpDLE1BQU07Z0JBQ0csVUFBVTtzQkFBbkIsTUFBTTtnQkFDRyx3QkFBd0I7c0JBQWpDLE1BQU07Z0JBU0UsaUJBQWlCO3NCQUF6QixLQUFLO2dCQUNHLFVBQVU7c0JBQWxCLEtBQUs7Z0JBR0YsTUFBTTtzQkFEVCxTQUFTO3VCQUFDLFFBQVEsRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBtb2RpZmljYWNpb24gN1xuaW1wb3J0IHtcbiAgQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3ksXG4gIENvbXBvbmVudCxcbiAgRWxlbWVudFJlZixcbiAgRXZlbnRFbWl0dGVyLFxuICBJbnB1dCxcbiAgTmdab25lLFxuICBPbkNoYW5nZXMsXG4gIE9uRGVzdHJveSxcbiAgT3V0cHV0LFxuICBWaWV3Q2hpbGQsXG4gIGluamVjdCxcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBDb21tb25Nb2R1bGUgfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHsgRU1QVFksIFN1YmplY3QsIGZyb21FdmVudCwgc3dpdGNoTWFwLCB0YWtlVW50aWwgfSBmcm9tICdyeGpzJztcblxuaW1wb3J0IHsgRW1vamlEYXRhIH0gZnJvbSAnLi9kYXRhL2RhdGEuaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBERUZBVUxUX0JBQ0tHUk9VTkRGTiwgRW1vamlTZXJ2aWNlIH0gZnJvbSAnLi9lbW9qaS5zZXJ2aWNlJztcblxuZXhwb3J0IGludGVyZmFjZSBFbW9qaSB7XG4gIC8qKiBSZW5kZXJzIHRoZSBuYXRpdmUgdW5pY29kZSBlbW9qaSAqL1xuICBpc05hdGl2ZTogYm9vbGVhbjtcbiAgZm9yY2VTaXplOiBib29sZWFuO1xuICB0b29sdGlwOiBib29sZWFuO1xuICBza2luOiAxIHwgMiB8IDMgfCA0IHwgNSB8IDY7XG4gIHNoZWV0U2l6ZTogMTYgfCAyMCB8IDMyIHwgNjQgfCA3MjtcbiAgc2hlZXRSb3dzPzogbnVtYmVyO1xuICBzZXQ6ICdhcHBsZScgfCAnZ29vZ2xlJyB8ICd0d2l0dGVyJyB8ICdmYWNlYm9vaycgfCAnJztcbiAgc2l6ZTogbnVtYmVyO1xuICBlbW9qaTogc3RyaW5nIHwgRW1vamlEYXRhO1xuICBiYWNrZ3JvdW5kSW1hZ2VGbjogKHNldDogc3RyaW5nLCBzaGVldFNpemU6IG51bWJlcikgPT4gc3RyaW5nO1xuICBmYWxsYmFjaz86IChkYXRhOiBhbnksIHByb3BzOiBhbnkpID0+IHN0cmluZztcbiAgZW1vamlPdmVyOiBFdmVudEVtaXR0ZXI8RW1vamlFdmVudD47XG4gIGVtb2ppTGVhdmU6IEV2ZW50RW1pdHRlcjxFbW9qaUV2ZW50PjtcbiAgZW1vamlDbGljazogRXZlbnRFbWl0dGVyPEVtb2ppRXZlbnQ+O1xuICBpbWFnZVVybEZuPzogKGVtb2ppOiBFbW9qaURhdGEgfCBudWxsKSA9PiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRW1vamlFdmVudCB7XG4gIGVtb2ppOiBFbW9qaURhdGE7XG4gICRldmVudDogRXZlbnQ7XG59XG5cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ25neC1lbW9qaScsXG4gIHRlbXBsYXRlOiBgXG4gICAgPG5nLXRlbXBsYXRlIFtuZ0lmXT1cImlzVmlzaWJsZVwiPlxuICAgICAgPGJ1dHRvblxuICAgICAgICAqbmdJZj1cInVzZUJ1dHRvbjsgZWxzZSBzcGFuVHBsXCJcbiAgICAgICAgI2J1dHRvblxuICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgW2F0dHIudGl0bGVdPVwidGl0bGVcIlxuICAgICAgICBbYXR0ci5hcmlhLWxhYmVsXT1cImxhYmVsXCJcbiAgICAgICAgY2xhc3M9XCJlbW9qaS1tYXJ0LWVtb2ppXCJcbiAgICAgICAgW2NsYXNzLmVtb2ppLW1hcnQtZW1vamktbmF0aXZlXT1cImlzTmF0aXZlXCJcbiAgICAgICAgW2NsYXNzLmVtb2ppLW1hcnQtZW1vamktY3VzdG9tXT1cImN1c3RvbVwiXG4gICAgICA+XG4gICAgICAgIDxzcGFuIHN0eWxlPVwiZGlzcGxheTogZmxleDsgYWxpZ24taXRlbXM6IGNlbnRlcjsganVzdGlmeS1jb250ZW50OiBjZW50ZXI7IHdpZHRoOiAxMDAlOyBoZWlnaHQ6IDEwMCU7XCI+XG4gICAgICAgICAgPHNwYW4gKm5nSWY9XCIhaXNOYXRpdmUgJiYgZmx1ZW50VXJsOyBlbHNlIG5hdGl2ZVRleHRcIiBbbmdTdHlsZV09XCJzdHlsZVwiPjwvc3Bhbj5cbiAgICAgICAgICA8bmctdGVtcGxhdGUgI25hdGl2ZVRleHQ+XG4gICAgICAgICAgICA8c3BhbiBbc3R5bGUuZm9udC1zaXplLnB4XT1cInNpemVcIj57eyB1bmlmaWVkVGV4dCB9fTwvc3Bhbj5cbiAgICAgICAgICA8L25nLXRlbXBsYXRlPlxuICAgICAgICA8L3NwYW4+XG4gICAgICA8L2J1dHRvbj5cbiAgICA8L25nLXRlbXBsYXRlPlxuXG4gICAgPG5nLXRlbXBsYXRlICNzcGFuVHBsPlxuICAgICAgPHNwYW5cbiAgICAgICAgI2J1dHRvblxuICAgICAgICBbYXR0ci50aXRsZV09XCJ0aXRsZVwiXG4gICAgICAgIFthdHRyLmFyaWEtbGFiZWxdPVwibGFiZWxcIlxuICAgICAgICBjbGFzcz1cImVtb2ppLW1hcnQtZW1vamlcIlxuICAgICAgICBbY2xhc3MuZW1vamktbWFydC1lbW9qaS1uYXRpdmVdPVwiaXNOYXRpdmVcIlxuICAgICAgICBbY2xhc3MuZW1vamktbWFydC1lbW9qaS1jdXN0b21dPVwiY3VzdG9tXCJcbiAgICAgID5cbiAgICAgICAgPHNwYW4gc3R5bGU9XCJkaXNwbGF5OiBmbGV4OyBhbGlnbi1pdGVtczogY2VudGVyOyBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjsgd2lkdGg6IDEwMCU7IGhlaWdodDogMTAwJTtcIj5cbiAgICAgICAgICA8c3BhbiAqbmdJZj1cIiFpc05hdGl2ZSAmJiBmbHVlbnRVcmw7IGVsc2UgbmF0aXZlVGV4dFwiIFtuZ1N0eWxlXT1cInN0eWxlXCI+PC9zcGFuPlxuICAgICAgICAgIDxuZy10ZW1wbGF0ZSAjbmF0aXZlVGV4dD5cbiAgICAgICAgICAgIDxzcGFuIFtzdHlsZS5mb250LXNpemUucHhdPVwic2l6ZVwiPnt7IHVuaWZpZWRUZXh0IH19PC9zcGFuPlxuICAgICAgICAgIDwvbmctdGVtcGxhdGU+XG4gICAgICAgIDwvc3Bhbj5cbiAgICAgIDwvc3Bhbj5cbiAgICA8L25nLXRlbXBsYXRlPlxuICBgLFxuICBjaGFuZ2VEZXRlY3Rpb246IENoYW5nZURldGVjdGlvblN0cmF0ZWd5Lk9uUHVzaCxcbiAgcHJlc2VydmVXaGl0ZXNwYWNlczogZmFsc2UsXG4gIHN0YW5kYWxvbmU6IHRydWUsXG4gIGltcG9ydHM6IFtDb21tb25Nb2R1bGVdLFxufSlcbmV4cG9ydCBjbGFzcyBFbW9qaUNvbXBvbmVudCBpbXBsZW1lbnRzIE9uQ2hhbmdlcywgRW1vamksIE9uRGVzdHJveSB7XG5cbiAgZ2V0IGZsdWVudEVtb2ppVXJsKCk6IHN0cmluZyB8IG51bGwge1xuICAgIGNvbnN0IGRhdGEgPSB0aGlzLmdldERhdGEoKTtcbiAgICBpZiAoIWRhdGEgfHwgIWRhdGEudW5pZmllZCkgcmV0dXJuIG51bGw7XG4gICAgY29uc3QgY29kaWdvVW5pZmljYWRvID0gZGF0YS51bmlmaWVkLnRvTG93ZXJDYXNlKCk7XG4gICAgcmV0dXJuIGBhc3NldHMvZmx1ZW50LWVtb2ppLyR7Y29kaWdvVW5pZmljYWRvfS53ZWJwYDtcbiAgfVxuXG4gIGdldCBmbHVlbnRFbW9qaVN0eWxlKCk6IGFueSB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5mbHVlbnRFbW9qaVVybDtcbiAgICBpZiAoIXVybCkgcmV0dXJuIG51bGw7XG4gICAgcmV0dXJuIHtcbiAgICAgIHdpZHRoOiBgJHt0aGlzLnNpemV9cHhgLFxuICAgICAgaGVpZ2h0OiBgJHt0aGlzLnNpemV9cHhgLFxuICAgICAgZGlzcGxheTogJ2lubGluZS1ibG9jaycsXG4gICAgICBiYWNrZ3JvdW5kSW1hZ2U6IGB1cmwoJHt1cmx9KWAsXG4gICAgICBiYWNrZ3JvdW5kU2l6ZTogJ2NvbnRhaW4nLFxuICAgICAgYmFja2dyb3VuZFJlcGVhdDogJ25vLXJlcGVhdCcsXG4gICAgICBiYWNrZ3JvdW5kUG9zaXRpb246ICdjZW50ZXInLFxuICAgIH07XG4gIH1cblxuXG4gIEBJbnB1dCgpIHNraW46IEVtb2ppWydza2luJ10gPSAxO1xuICBASW5wdXQoKSBzZXQ6IEVtb2ppWydzZXQnXSA9ICdhcHBsZSc7XG4gIEBJbnB1dCgpIHNoZWV0U2l6ZTogRW1vamlbJ3NoZWV0U2l6ZSddID0gNjQ7XG4gIC8qKiBSZW5kZXJzIHRoZSBuYXRpdmUgdW5pY29kZSBlbW9qaSAqL1xuICBASW5wdXQoKSBpc05hdGl2ZTogRW1vamlbJ2lzTmF0aXZlJ10gPSBmYWxzZTtcbiAgQElucHV0KCkgZm9yY2VTaXplOiBFbW9qaVsnZm9yY2VTaXplJ10gPSBmYWxzZTtcbiAgQElucHV0KCkgdG9vbHRpcDogRW1vamlbJ3Rvb2x0aXAnXSA9IGZhbHNlO1xuICBASW5wdXQoKSBzaXplOiBFbW9qaVsnc2l6ZSddID0gMjQ7XG4gIEBJbnB1dCgpIGVtb2ppOiBFbW9qaVsnZW1vamknXSA9ICcnO1xuICBASW5wdXQoKSBmYWxsYmFjaz86IEVtb2ppWydmYWxsYmFjayddO1xuICBASW5wdXQoKSBoaWRlT2Jzb2xldGUgPSBmYWxzZTtcbiAgQElucHV0KCkgc2hlZXRSb3dzPzogbnVtYmVyO1xuICBASW5wdXQoKSBzaGVldENvbHVtbnM/OiBudW1iZXI7XG4gIEBJbnB1dCgpIHVzZUJ1dHRvbj86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBOb3RlOiBgZW1vamlPdmVyYCBhbmQgYGVtb2ppT3Zlck91dHNpZGVBbmd1bGFyYCBhcmUgZGlzcGF0Y2hlZCBvbiB0aGUgc2FtZSBldmVudCAoYG1vdXNlZW50ZXJgKSwgYnV0XG4gICAqICAgICAgIGZvciBkaWZmZXJlbnQgcHVycG9zZXMuIFRoZSBgZW1vamlPdmVyT3V0c2lkZUFuZ3VsYXJgIGV2ZW50IGlzIGxpc3RlbmVkIG9ubHkgaW4gYGVtb2ppLWNhdGVnb3J5YFxuICAgKiAgICAgICBjb21wb25lbnQgYW5kIHRoZSBjYXRlZ29yeSBjb21wb25lbnQgZG9lc24ndCBjYXJlIGFib3V0IHpvbmUgY29udGV4dCB0aGUgY2FsbGJhY2sgaXMgYmVpbmcgY2FsbGVkIGluLlxuICAgKiAgICAgICBUaGUgYGVtb2ppT3ZlcmAgaXMgZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5IGlmIGFueW9uZSBpcyBsaXN0ZW5pbmcgdG8gdGhpcyBldmVudCBleHBsaWNpdGx5IGluIHRoZWlyIGNvZGUuXG4gICAqL1xuICBAT3V0cHV0KCkgZW1vamlPdmVyOiBFbW9qaVsnZW1vamlPdmVyJ10gPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gIEBPdXRwdXQoKSBlbW9qaU92ZXJPdXRzaWRlQW5ndWxhcjogRW1vamlbJ2Vtb2ppT3ZlciddID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICAvKiogU2VlIGNvbW1lbnRzIGFib3ZlLCB0aGlzIHNlcnZlcyB0aGUgc2FtZSBwdXJwb3NlLiAqL1xuICBAT3V0cHV0KCkgZW1vamlMZWF2ZTogRW1vamlbJ2Vtb2ppTGVhdmUnXSA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgQE91dHB1dCgpIGVtb2ppTGVhdmVPdXRzaWRlQW5ndWxhcjogRW1vamlbJ2Vtb2ppTGVhdmUnXSA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgQE91dHB1dCgpIGVtb2ppQ2xpY2s6IEVtb2ppWydlbW9qaUNsaWNrJ10gPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gIEBPdXRwdXQoKSBlbW9qaUNsaWNrT3V0c2lkZUFuZ3VsYXI6IEVtb2ppWydlbW9qaUNsaWNrJ10gPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG5cbiAgc3R5bGU6IGFueTtcbiAgdGl0bGU/OiBzdHJpbmcgPSB1bmRlZmluZWQ7XG4gIGxhYmVsID0gJyc7XG4gIHVuaWZpZWQ/OiBzdHJpbmcgfCBudWxsO1xuICBjdXN0b20gPSBmYWxzZTtcbiAgaXNWaXNpYmxlID0gdHJ1ZTtcbiAgLy8gVE9ETzogcmVwbGFjZSA0LjAuMyB3LyBkeW5hbWljIGdldCB2ZXJpc29uIGZyb20gZW1vamktZGF0YXNvdXJjZSBpbiBwYWNrYWdlLmpzb25cbiAgQElucHV0KCkgYmFja2dyb3VuZEltYWdlRm46IEVtb2ppWydiYWNrZ3JvdW5kSW1hZ2VGbiddID0gREVGQVVMVF9CQUNLR1JPVU5ERk47XG4gIEBJbnB1dCgpIGltYWdlVXJsRm4/OiBFbW9qaVsnaW1hZ2VVcmxGbiddO1xuXG4gIEBWaWV3Q2hpbGQoJ2J1dHRvbicsIHsgc3RhdGljOiBmYWxzZSB9KVxuICBzZXQgYnV0dG9uKGJ1dHRvbjogRWxlbWVudFJlZjxIVE1MRWxlbWVudD4gfCB1bmRlZmluZWQpIHtcbiAgICAvLyBOb3RlOiBgcnVuT3V0c2lkZUFuZ3VsYXJgIGlzIHVzZWQgdG8gdHJpZ2dlciBgYWRkRXZlbnRMaXN0ZW5lcmAgb3V0c2lkZSBvZiB0aGUgQW5ndWxhciB6b25lXG4gICAgLy8gICAgICAgdG9vLiBTZWUgYHNldHVwTW91c2VFbnRlckxpc3RlbmVyYC4gVGhlIGBzd2l0Y2hNYXBgIHdpbGwgc3Vic2NyaWJlIHRvIGBmcm9tRXZlbnRgIGNvbnNpZGVyaW5nXG4gICAgLy8gICAgICAgdGhlIGNvbnRleHQgd2hlcmUgdGhlIGZhY3RvcnkgaXMgY2FsbGVkIGluLlxuICAgIHRoaXMubmdab25lLnJ1bk91dHNpZGVBbmd1bGFyKCgpID0+IHRoaXMuYnV0dG9uJC5uZXh0KGJ1dHRvbj8ubmF0aXZlRWxlbWVudCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBzdWJqZWN0IHVzZWQgdG8gZW1pdCB3aGVuZXZlciB2aWV3IHF1ZXJpZXMgYXJlIHJ1biBhbmQgYGJ1dHRvbmAgb3IgYHNwYW5gIGlzIHNldC9yZW1vdmVkLlxuICAgKiBXZSB1c2Ugc3ViamVjdCB0byBrZWVwIHRoZSByZWFjdGl2ZSBiZWhhdmlvciBzbyB3ZSBkb24ndCBoYXZlIHRvIGFkZCBhbmQgcmVtb3ZlIGV2ZW50IGxpc3RlbmVycyBtYW51YWxseS5cbiAgICovXG4gIHByaXZhdGUgcmVhZG9ubHkgYnV0dG9uJCA9IG5ldyBTdWJqZWN0PEhUTUxFbGVtZW50IHwgdW5kZWZpbmVkPigpO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgZGVzdHJveSQgPSBuZXcgU3ViamVjdDx2b2lkPigpO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgbmdab25lID0gaW5qZWN0KE5nWm9uZSk7XG4gIHByaXZhdGUgcmVhZG9ubHkgZW1vamlTZXJ2aWNlID0gaW5qZWN0KEVtb2ppU2VydmljZSk7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5zZXR1cE1vdXNlTGlzdGVuZXJzKCk7XG4gIH1cblxuXG51bmlmaWVkVGV4dD86IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICBmbHVlbnRVcmw6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuXG4gIG5nT25DaGFuZ2VzKCkge1xuICAgIGlmICghdGhpcy5lbW9qaSkge1xuICAgICAgcmV0dXJuICh0aGlzLmlzVmlzaWJsZSA9IGZhbHNlKTtcbiAgICB9XG4gICAgY29uc3QgZGF0YSA9IHRoaXMuZ2V0RGF0YSgpO1xuICAgIGlmICghZGF0YSkge1xuICAgICAgcmV0dXJuICh0aGlzLmlzVmlzaWJsZSA9IGZhbHNlKTtcbiAgICB9XG5cbiAgICB0aGlzLnVuaWZpZWRUZXh0ID0gZGF0YS5uYXRpdmUgfHwgbnVsbDtcbiAgICBpZiAoZGF0YS5jdXN0b20pIHtcbiAgICAgIHRoaXMuY3VzdG9tID0gZGF0YS5jdXN0b207XG4gICAgfVxuICAgIGlmICghZGF0YS51bmlmaWVkICYmICFkYXRhLmN1c3RvbSkge1xuICAgICAgcmV0dXJuICh0aGlzLmlzVmlzaWJsZSA9IGZhbHNlKTtcbiAgICB9XG4gICAgaWYgKHRoaXMudG9vbHRpcCkge1xuICAgICAgdGhpcy50aXRsZSA9IGRhdGEuc2hvcnROYW1lc1swXTtcbiAgICB9XG4gICAgaWYgKGRhdGEub2Jzb2xldGVkQnkgJiYgdGhpcy5oaWRlT2Jzb2xldGUpIHtcbiAgICAgIHJldHVybiAodGhpcy5pc1Zpc2libGUgPSBmYWxzZSk7XG4gICAgfVxuXG4gICAgdGhpcy5sYWJlbCA9IFtkYXRhLm5hdGl2ZV0uY29uY2F0KGRhdGEuc2hvcnROYW1lcykuZmlsdGVyKEJvb2xlYW4pLmpvaW4oJywgJyk7XG5cbiAgICAvLyBWZXJpZmljYW1vcyBzaSBlcyB1bmEgZmFtaWxpYSBjb21wbGVqYSBjb24gWldKIHF1ZSBzYWJlbW9zIHF1ZSBubyB0aWVuZSBhc3NldFxuICAgIGNvbnN0IGlzQ29tcGxleEZhbWlseSA9IGRhdGEudW5pZmllZCAmJiBkYXRhLnVuaWZpZWQuaW5jbHVkZXMoJzIwMGQnKTtcblxuICAgIGlmIChkYXRhLnVuaWZpZWQgJiYgIWlzQ29tcGxleEZhbWlseSkge1xuICAgICAgY29uc3QgY29kaWdvVW5pZmljYWRvID0gZGF0YS51bmlmaWVkLnRvTG93ZXJDYXNlKCk7XG4gICAgICB0aGlzLmZsdWVudFVybCA9IGBhc3NldHMvZmx1ZW50LWVtb2ppLyR7Y29kaWdvVW5pZmljYWRvfS53ZWJwYDtcbiAgICAgIHRoaXMuaXNOYXRpdmUgPSBmYWxzZTtcbiAgICAgIHRoaXMuc3R5bGUgPSB7XG4gICAgICAgIHdpZHRoOiBgJHt0aGlzLnNpemV9cHhgLFxuICAgICAgICBoZWlnaHQ6IGAke3RoaXMuc2l6ZX1weGAsXG4gICAgICAgIGRpc3BsYXk6ICdpbmxpbmUtYmxvY2snLFxuICAgICAgICBiYWNrZ3JvdW5kSW1hZ2U6IGB1cmwoJHt0aGlzLmZsdWVudFVybH0pYCxcbiAgICAgICAgYmFja2dyb3VuZFNpemU6ICdjb250YWluJyxcbiAgICAgICAgYmFja2dyb3VuZFJlcGVhdDogJ25vLXJlcGVhdCcsXG4gICAgICAgIGJhY2tncm91bmRQb3NpdGlvbjogJ2NlbnRlcicsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBGYWxsYmFjayBuYXRpdm8gaW5tZWRpYXRvIHBhcmEgY2Fzb3MgY29tcGxlam9zXG4gICAgICB0aGlzLmlzTmF0aXZlID0gdHJ1ZTtcbiAgICAgIHRoaXMuZmx1ZW50VXJsID0gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gKHRoaXMuaXNWaXNpYmxlID0gdHJ1ZSk7XG4gIH1cblxuXG5cbiAgcHJpdmF0ZSBpc01pc3NpbmdBc3NldCh1bmlmaWVkPzogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgaWYgKCF1bmlmaWVkKSByZXR1cm4gdHJ1ZTtcbiAgICBjb25zdCBsb3dlclVuaWZpZWQgPSB1bmlmaWVkLnRvTG93ZXJDYXNlKCk7XG4gICAgLy8gMS4gRmFtaWxpYXMgY29tcGxlamFzIGNvbiBaV0pcbiAgICBjb25zdCBpc0NvbXBsZXhGYW1pbHkgPSBsb3dlclVuaWZpZWQuaW5jbHVkZXMoJzIwMGQnKTtcbiAgICAvLyAyLiBCYW5kZXJhcyBuYWNpb25hbGVzIGRlIGRvYmxlIGxldHJhIChlai4gMWYxZTctMWYxZjEsIDFmMWU4LTFmMWY1LCBldGMuKVxuICAgIGNvbnN0IGlzUmVnaW9uRmxhZyA9IC9eWzFmMWUwLTFmMWZmXS1bMWYxZTAtMWYxZmZdJC8udGVzdChsb3dlclVuaWZpZWQpIHx8IGxvd2VyVW5pZmllZC5pbmNsdWRlcygnMWYxZScpO1xuICAgIC8vIDMuIEJhbmRlcmFzIHJlZ2lvbmFsZXMgZXNwZWNpYWxlcyAvIHN1Yi1uYWNpb25hbGVzIChJbmdsYXRlcnJhLCBFc2NvY2lhLCBHYWxlcyBjb24gZTAwLi4uKVxuICAgIGNvbnN0IGlzU3ViTmF0aW9uRmxhZyA9IGxvd2VyVW5pZmllZC5zdGFydHNXaXRoKCcxZjNmNCcpIHx8IGxvd2VyVW5pZmllZC5pbmNsdWRlcygnZTAwJyk7XG4gICAgcmV0dXJuIGlzQ29tcGxleEZhbWlseSB8fCBpc1JlZ2lvbkZsYWcgfHwgaXNTdWJOYXRpb25GbGFnO1xuICB9XG5cblxuICBuZ09uRGVzdHJveSgpOiB2b2lkIHtcbiAgICB0aGlzLmRlc3Ryb3kkLm5leHQoKTtcbiAgfVxuXG4gIGdldERhdGEoKSB7XG4gICAgcmV0dXJuIHRoaXMuZW1vamlTZXJ2aWNlLmdldERhdGEodGhpcy5lbW9qaSwgdGhpcy5za2luLCB0aGlzLnNldCk7XG4gIH1cblxuICBnZXRTYW5pdGl6ZWREYXRhKCk6IEVtb2ppRGF0YSB7XG4gICAgcmV0dXJuIHRoaXMuZW1vamlTZXJ2aWNlLmdldFNhbml0aXplZERhdGEodGhpcy5lbW9qaSwgdGhpcy5za2luLCB0aGlzLnNldCkgYXMgRW1vamlEYXRhO1xuICB9XG5cbiAgcHJpdmF0ZSBzZXR1cE1vdXNlTGlzdGVuZXJzKCk6IHZvaWQge1xuICAgIGNvbnN0IGV2ZW50TGlzdGVuZXIkID0gKGV2ZW50TmFtZTogc3RyaW5nKSA9PlxuICAgICAgdGhpcy5idXR0b24kLnBpcGUoXG4gICAgICAgIC8vIE5vdGU6IGBFTVBUWWAgaXMgdXNlZCB0byByZW1vdmUgZXZlbnQgbGlzdGVuZXIgb25jZSB0aGUgRE9NIG5vZGUgaXMgcmVtb3ZlZC5cbiAgICAgICAgc3dpdGNoTWFwKGJ1dHRvbiA9PiAoYnV0dG9uID8gZnJvbUV2ZW50KGJ1dHRvbiwgZXZlbnROYW1lKSA6IEVNUFRZKSksXG4gICAgICAgIHRha2VVbnRpbCh0aGlzLmRlc3Ryb3kkKSxcbiAgICAgICk7XG5cbiAgICBldmVudExpc3RlbmVyJCgnY2xpY2snKS5zdWJzY3JpYmUoJGV2ZW50ID0+IHtcbiAgICAgIGNvbnN0IGVtb2ppID0gdGhpcy5nZXRTYW5pdGl6ZWREYXRhKCk7XG4gICAgICB0aGlzLmVtb2ppQ2xpY2tPdXRzaWRlQW5ndWxhci5lbWl0KHsgZW1vamksICRldmVudCB9KTtcbiAgICAgIC8vIE5vdGU6IHRoaXMgaXMgZG9uZSBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkuIFdlIHJ1biBjaGFuZ2UgZGV0ZWN0aW9uIGlmIGRldmVsb3BlcnNcbiAgICAgIC8vICAgICAgIGFyZSBsaXN0ZW5pbmcgdG8gYGVtb2ppQ2xpY2tgIGluIHRoZWlyIGNvZGUuIEZvciBpbnN0YW5jZTpcbiAgICAgIC8vICAgICAgIGA8bmd4LWVtb2ppIChlbW9qaUNsaWNrKT1cIi4uLlwiPjwvbmd4LWVtb2ppPmAuXG4gICAgICBpZiAodGhpcy5lbW9qaUNsaWNrLm9ic2VydmVkKSB7XG4gICAgICAgIHRoaXMubmdab25lLnJ1bigoKSA9PiB0aGlzLmVtb2ppQ2xpY2suZW1pdCh7IGVtb2ppLCAkZXZlbnQgfSkpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgZXZlbnRMaXN0ZW5lciQoJ21vdXNlZW50ZXInKS5zdWJzY3JpYmUoJGV2ZW50ID0+IHtcbiAgICAgIGNvbnN0IGVtb2ppID0gdGhpcy5nZXRTYW5pdGl6ZWREYXRhKCk7XG4gICAgICB0aGlzLmVtb2ppT3Zlck91dHNpZGVBbmd1bGFyLmVtaXQoeyBlbW9qaSwgJGV2ZW50IH0pO1xuICAgICAgLy8gTm90ZTogdGhpcyBpcyBkb25lIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eS4gV2UgcnVuIGNoYW5nZSBkZXRlY3Rpb24gaWYgZGV2ZWxvcGVyc1xuICAgICAgLy8gICAgICAgYXJlIGxpc3RlbmluZyB0byBgZW1vamlPdmVyYCBpbiB0aGVpciBjb2RlLiBGb3IgaW5zdGFuY2U6XG4gICAgICAvLyAgICAgICBgPG5neC1lbW9qaSAoZW1vamlPdmVyKT1cIi4uLlwiPjwvbmd4LWVtb2ppPmAuXG4gICAgICBpZiAodGhpcy5lbW9qaU92ZXIub2JzZXJ2ZWQpIHtcbiAgICAgICAgdGhpcy5uZ1pvbmUucnVuKCgpID0+IHRoaXMuZW1vamlPdmVyLmVtaXQoeyBlbW9qaSwgJGV2ZW50IH0pKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGV2ZW50TGlzdGVuZXIkKCdtb3VzZWxlYXZlJykuc3Vic2NyaWJlKCRldmVudCA9PiB7XG4gICAgICBjb25zdCBlbW9qaSA9IHRoaXMuZ2V0U2FuaXRpemVkRGF0YSgpO1xuICAgICAgdGhpcy5lbW9qaUxlYXZlT3V0c2lkZUFuZ3VsYXIuZW1pdCh7IGVtb2ppLCAkZXZlbnQgfSk7XG4gICAgICAvLyBOb3RlOiB0aGlzIGlzIGRvbmUgZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5LiBXZSBydW4gY2hhbmdlIGRldGVjdGlvbiBpZiBkZXZlbG9wZXJzXG4gICAgICAvLyAgICAgICBhcmUgbGlzdGVuaW5nIHRvIGBlbW9qaUxlYXZlYCBpbiB0aGVpciBjb2RlLiBGb3IgaW5zdGFuY2U6XG4gICAgICAvLyAgICAgICBgPG5neC1lbW9qaSAoZW1vamlMZWF2ZSk9XCIuLi5cIj48L25neC1lbW9qaT5gLlxuICAgICAgaWYgKHRoaXMuZW1vamlMZWF2ZS5vYnNlcnZlZCkge1xuICAgICAgICB0aGlzLm5nWm9uZS5ydW4oKCkgPT4gdGhpcy5lbW9qaUxlYXZlLmVtaXQoeyBlbW9qaSwgJGV2ZW50IH0pKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuIl19