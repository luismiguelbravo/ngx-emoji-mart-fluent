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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1vamkuY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9waWNrZXIvbmd4LWVtb2ppL2Vtb2ppLmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxpQkFBaUI7QUFDakIsT0FBTyxFQUNMLHVCQUF1QixFQUN2QixTQUFTLEVBRVQsWUFBWSxFQUNaLEtBQUssRUFDTCxNQUFNLEVBR04sTUFBTSxFQUNOLFNBQVMsRUFDVCxNQUFNLEdBQ1AsTUFBTSxlQUFlLENBQUM7QUFDdkIsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBR3ZFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxZQUFZLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQzs7O0FBMEJyRSxNQXdDYSxjQUFjO0lBRXpCLElBQUksY0FBYztRQUNoQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDNUIsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPO1lBQUUsT0FBTyxJQUFJLENBQUM7UUFDeEMsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNuRCxPQUFPLHVCQUF1QixlQUFlLE9BQU8sQ0FBQztJQUN2RCxDQUFDO0lBRUQsSUFBSSxnQkFBZ0I7UUFDbEIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQztRQUNoQyxJQUFJLENBQUMsR0FBRztZQUFFLE9BQU8sSUFBSSxDQUFDO1FBQ3RCLE9BQU87WUFDTCxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxJQUFJO1lBQ3ZCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLElBQUk7WUFDeEIsT0FB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STtvQkFDaEIsT0FBTyxFQUFFLENBQUMsWUFBWSxDQUFDO2lCQUN4QjswRUF5QlUsSUFBSTtzQkFBWixLQUFLO2dCQUNHLEdBQUc7c0JBQVgsS0FBSztnQkFDRyxTQUFTO3NCQUFqQixLQUFLO2dCQUVHLFFBQVE7c0JBQWhCLEtBQUs7Z0JBQ0csU0FBUztzQkFBakIsS0FBSztnQkFDRyxPQUFPO3NCQUFmLEtBQUs7Z0JBQ0csSUFBSTtzQkFBWixLQUFLO2dCQUNHLEtBQUs7c0JBQWIsS0FBSztnQkFDRyxRQUFRO3NCQUFoQixLQUFLO2dCQUNHLFlBQVk7c0JBQXBCLEtBQUs7Z0JBQ0csU0FBUztzQkFBakIsS0FBSztnQkFDRyxZQUFZO3NCQUFwQixLQUFLO2dCQUNHLFNBQVM7c0JBQWpCLEtBQUs7Z0JBT0ksU0FBUztzQkFBbEIsTUFBTTtnQkFDRyx1QkFBdUI7c0JBQWhDLE1BQU07Z0JBRUcsVUFBVTtzQkFBbkIsTUFBTTtnQkFDRyx3QkFBd0I7c0JBQWpDLE1BQU07Z0JBQ0csVUFBVTtzQkFBbkIsTUFBTTtnQkFDRyx3QkFBd0I7c0JBQWpDLE1BQU07Z0JBU0UsaUJBQWlCO3NCQUF6QixLQUFLO2dCQUNHLFVBQVU7c0JBQWxCLEtBQUs7Z0JBR0YsTUFBTTtzQkFEVCxTQUFTO3VCQUFDLFFBQVEsRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBtb2RpZmljYWNpb24gN1xuaW1wb3J0IHtcbiAgQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3ksXG4gIENvbXBvbmVudCxcbiAgRWxlbWVudFJlZixcbiAgRXZlbnRFbWl0dGVyLFxuICBJbnB1dCxcbiAgTmdab25lLFxuICBPbkNoYW5nZXMsXG4gIE9uRGVzdHJveSxcbiAgT3V0cHV0LFxuICBWaWV3Q2hpbGQsXG4gIGluamVjdCxcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBDb21tb25Nb2R1bGUgfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHsgRU1QVFksIFN1YmplY3QsIGZyb21FdmVudCwgc3dpdGNoTWFwLCB0YWtlVW50aWwgfSBmcm9tICdyeGpzJztcblxuaW1wb3J0IHsgRW1vamlEYXRhIH0gZnJvbSAnLi9kYXRhL2RhdGEuaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBERUZBVUxUX0JBQ0tHUk9VTkRGTiwgRW1vamlTZXJ2aWNlIH0gZnJvbSAnLi9lbW9qaS5zZXJ2aWNlJztcblxuZXhwb3J0IGludGVyZmFjZSBFbW9qaSB7XG4gIC8qKiBSZW5kZXJzIHRoZSBuYXRpdmUgdW5pY29kZSBlbW9qaSAqL1xuICBpc05hdGl2ZTogYm9vbGVhbjtcbiAgZm9yY2VTaXplOiBib29sZWFuO1xuICB0b29sdGlwOiBib29sZWFuO1xuICBza2luOiAxIHwgMiB8IDMgfCA0IHwgNSB8IDY7XG4gIHNoZWV0U2l6ZTogMTYgfCAyMCB8IDMyIHwgNjQgfCA3MjtcbiAgc2hlZXRSb3dzPzogbnVtYmVyO1xuICBzZXQ6ICdhcHBsZScgfCAnZ29vZ2xlJyB8ICd0d2l0dGVyJyB8ICdmYWNlYm9vaycgfCAnJztcbiAgc2l6ZTogbnVtYmVyO1xuICBlbW9qaTogc3RyaW5nIHwgRW1vamlEYXRhO1xuICBiYWNrZ3JvdW5kSW1hZ2VGbjogKHNldDogc3RyaW5nLCBzaGVldFNpemU6IG51bWJlcikgPT4gc3RyaW5nO1xuICBmYWxsYmFjaz86IChkYXRhOiBhbnksIHByb3BzOiBhbnkpID0+IHN0cmluZztcbiAgZW1vamlPdmVyOiBFdmVudEVtaXR0ZXI8RW1vamlFdmVudD47XG4gIGVtb2ppTGVhdmU6IEV2ZW50RW1pdHRlcjxFbW9qaUV2ZW50PjtcbiAgZW1vamlDbGljazogRXZlbnRFbWl0dGVyPEVtb2ppRXZlbnQ+O1xuICBpbWFnZVVybEZuPzogKGVtb2ppOiBFbW9qaURhdGEgfCBudWxsKSA9PiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRW1vamlFdmVudCB7XG4gIGVtb2ppOiBFbW9qaURhdGE7XG4gICRldmVudDogRXZlbnQ7XG59XG5cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ25neC1lbW9qaScsXG4gIHRlbXBsYXRlOiBgXG4gICAgPG5nLXRlbXBsYXRlIFtuZ0lmXT1cImlzVmlzaWJsZVwiPlxuICAgICAgPGJ1dHRvblxuICAgICAgICAqbmdJZj1cInVzZUJ1dHRvbjsgZWxzZSBzcGFuVHBsXCJcbiAgICAgICAgI2J1dHRvblxuICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgW2F0dHIudGl0bGVdPVwidGl0bGVcIlxuICAgICAgICBbYXR0ci5hcmlhLWxhYmVsXT1cImxhYmVsXCJcbiAgICAgICAgY2xhc3M9XCJlbW9qaS1tYXJ0LWVtb2ppXCJcbiAgICAgICAgW2NsYXNzLmVtb2ppLW1hcnQtZW1vamktbmF0aXZlXT1cImlzTmF0aXZlXCJcbiAgICAgICAgW2NsYXNzLmVtb2ppLW1hcnQtZW1vamktY3VzdG9tXT1cImN1c3RvbVwiXG4gICAgICA+XG4gICAgICAgIDxzcGFuIFtuZ1N0eWxlXT1cInN0eWxlXCIgc3R5bGU9XCJkaXNwbGF5OiBmbGV4OyBhbGlnbi1pdGVtczogY2VudGVyOyBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjsgd2lkdGg6IDEwMCU7IGhlaWdodDogMTAwJTtcIj5cbiAgICAgICAgICA8bmctY29udGVudD48L25nLWNvbnRlbnQ+XG4gICAgICAgIDwvc3Bhbj5cbiAgICAgIDwvYnV0dG9uPlxuICAgIDwvbmctdGVtcGxhdGU+XG5cbiAgICA8bmctdGVtcGxhdGUgI3NwYW5UcGw+XG4gICAgICA8c3BhblxuICAgICAgICAjYnV0dG9uXG4gICAgICAgIFthdHRyLnRpdGxlXT1cInRpdGxlXCJcbiAgICAgICAgW2F0dHIuYXJpYS1sYWJlbF09XCJsYWJlbFwiXG4gICAgICAgIGNsYXNzPVwiZW1vamktbWFydC1lbW9qaVwiXG4gICAgICAgIFtjbGFzcy5lbW9qaS1tYXJ0LWVtb2ppLW5hdGl2ZV09XCJpc05hdGl2ZVwiXG4gICAgICAgIFtjbGFzcy5lbW9qaS1tYXJ0LWVtb2ppLWN1c3RvbV09XCJjdXN0b21cIlxuICAgICAgPlxuICAgICAgICA8c3BhbiBbbmdTdHlsZV09XCJzdHlsZVwiIHN0eWxlPVwiZGlzcGxheTogZmxleDsgYWxpZ24taXRlbXM6IGNlbnRlcjsganVzdGlmeS1jb250ZW50OiBjZW50ZXI7IHdpZHRoOiAxMDAlOyBoZWlnaHQ6IDEwMCU7XCI+XG4gICAgICAgICAgPG5nLWNvbnRlbnQ+PC9uZy1jb250ZW50PlxuICAgICAgICA8L3NwYW4+XG4gICAgICA8L3NwYW4+XG4gICAgPC9uZy10ZW1wbGF0ZT5cbiAgYCxcbiAgY2hhbmdlRGV0ZWN0aW9uOiBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneS5PblB1c2gsXG4gIHByZXNlcnZlV2hpdGVzcGFjZXM6IGZhbHNlLFxuICBzdGFuZGFsb25lOiB0cnVlLFxuICBpbXBvcnRzOiBbQ29tbW9uTW9kdWxlXSxcbn0pXG5leHBvcnQgY2xhc3MgRW1vamlDb21wb25lbnQgaW1wbGVtZW50cyBPbkNoYW5nZXMsIEVtb2ppLCBPbkRlc3Ryb3kge1xuXG4gIGdldCBmbHVlbnRFbW9qaVVybCgpOiBzdHJpbmcgfCBudWxsIHtcbiAgICBjb25zdCBkYXRhID0gdGhpcy5nZXREYXRhKCk7XG4gICAgaWYgKCFkYXRhIHx8ICFkYXRhLnVuaWZpZWQpIHJldHVybiBudWxsO1xuICAgIGNvbnN0IGNvZGlnb1VuaWZpY2FkbyA9IGRhdGEudW5pZmllZC50b0xvd2VyQ2FzZSgpO1xuICAgIHJldHVybiBgYXNzZXRzL2ZsdWVudC1lbW9qaS8ke2NvZGlnb1VuaWZpY2Fkb30ud2VicGA7XG4gIH1cblxuICBnZXQgZmx1ZW50RW1vamlTdHlsZSgpOiBhbnkge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuZmx1ZW50RW1vamlVcmw7XG4gICAgaWYgKCF1cmwpIHJldHVybiBudWxsO1xuICAgIHJldHVybiB7XG4gICAgICB3aWR0aDogYCR7dGhpcy5zaXplfXB4YCxcbiAgICAgIGhlaWdodDogYCR7dGhpcy5zaXplfXB4YCxcbiAgICAgIGRpc3BsYXk6ICdpbmxpbmUtYmxvY2snLFxuICAgICAgYmFja2dyb3VuZEltYWdlOiBgdXJsKCR7dXJsfSlgLFxuICAgICAgYmFja2dyb3VuZFNpemU6ICdjb250YWluJyxcbiAgICAgIGJhY2tncm91bmRSZXBlYXQ6ICduby1yZXBlYXQnLFxuICAgICAgYmFja2dyb3VuZFBvc2l0aW9uOiAnY2VudGVyJyxcbiAgICB9O1xuICB9XG5cblxuICBASW5wdXQoKSBza2luOiBFbW9qaVsnc2tpbiddID0gMTtcbiAgQElucHV0KCkgc2V0OiBFbW9qaVsnc2V0J10gPSAnYXBwbGUnO1xuICBASW5wdXQoKSBzaGVldFNpemU6IEVtb2ppWydzaGVldFNpemUnXSA9IDY0O1xuICAvKiogUmVuZGVycyB0aGUgbmF0aXZlIHVuaWNvZGUgZW1vamkgKi9cbiAgQElucHV0KCkgaXNOYXRpdmU6IEVtb2ppWydpc05hdGl2ZSddID0gZmFsc2U7XG4gIEBJbnB1dCgpIGZvcmNlU2l6ZTogRW1vamlbJ2ZvcmNlU2l6ZSddID0gZmFsc2U7XG4gIEBJbnB1dCgpIHRvb2x0aXA6IEVtb2ppWyd0b29sdGlwJ10gPSBmYWxzZTtcbiAgQElucHV0KCkgc2l6ZTogRW1vamlbJ3NpemUnXSA9IDI0O1xuICBASW5wdXQoKSBlbW9qaTogRW1vamlbJ2Vtb2ppJ10gPSAnJztcbiAgQElucHV0KCkgZmFsbGJhY2s/OiBFbW9qaVsnZmFsbGJhY2snXTtcbiAgQElucHV0KCkgaGlkZU9ic29sZXRlID0gZmFsc2U7XG4gIEBJbnB1dCgpIHNoZWV0Um93cz86IG51bWJlcjtcbiAgQElucHV0KCkgc2hlZXRDb2x1bW5zPzogbnVtYmVyO1xuICBASW5wdXQoKSB1c2VCdXR0b24/OiBib29sZWFuO1xuICAvKipcbiAgICogTm90ZTogYGVtb2ppT3ZlcmAgYW5kIGBlbW9qaU92ZXJPdXRzaWRlQW5ndWxhcmAgYXJlIGRpc3BhdGNoZWQgb24gdGhlIHNhbWUgZXZlbnQgKGBtb3VzZWVudGVyYCksIGJ1dFxuICAgKiAgICAgICBmb3IgZGlmZmVyZW50IHB1cnBvc2VzLiBUaGUgYGVtb2ppT3Zlck91dHNpZGVBbmd1bGFyYCBldmVudCBpcyBsaXN0ZW5lZCBvbmx5IGluIGBlbW9qaS1jYXRlZ29yeWBcbiAgICogICAgICAgY29tcG9uZW50IGFuZCB0aGUgY2F0ZWdvcnkgY29tcG9uZW50IGRvZXNuJ3QgY2FyZSBhYm91dCB6b25lIGNvbnRleHQgdGhlIGNhbGxiYWNrIGlzIGJlaW5nIGNhbGxlZCBpbi5cbiAgICogICAgICAgVGhlIGBlbW9qaU92ZXJgIGlzIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eSBpZiBhbnlvbmUgaXMgbGlzdGVuaW5nIHRvIHRoaXMgZXZlbnQgZXhwbGljaXRseSBpbiB0aGVpciBjb2RlLlxuICAgKi9cbiAgQE91dHB1dCgpIGVtb2ppT3ZlcjogRW1vamlbJ2Vtb2ppT3ZlciddID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICBAT3V0cHV0KCkgZW1vamlPdmVyT3V0c2lkZUFuZ3VsYXI6IEVtb2ppWydlbW9qaU92ZXInXSA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgLyoqIFNlZSBjb21tZW50cyBhYm92ZSwgdGhpcyBzZXJ2ZXMgdGhlIHNhbWUgcHVycG9zZS4gKi9cbiAgQE91dHB1dCgpIGVtb2ppTGVhdmU6IEVtb2ppWydlbW9qaUxlYXZlJ10gPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gIEBPdXRwdXQoKSBlbW9qaUxlYXZlT3V0c2lkZUFuZ3VsYXI6IEVtb2ppWydlbW9qaUxlYXZlJ10gPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gIEBPdXRwdXQoKSBlbW9qaUNsaWNrOiBFbW9qaVsnZW1vamlDbGljayddID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICBAT3V0cHV0KCkgZW1vamlDbGlja091dHNpZGVBbmd1bGFyOiBFbW9qaVsnZW1vamlDbGljayddID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuXG4gIHN0eWxlOiBhbnk7XG4gIHRpdGxlPzogc3RyaW5nID0gdW5kZWZpbmVkO1xuICBsYWJlbCA9ICcnO1xuICB1bmlmaWVkPzogc3RyaW5nIHwgbnVsbDtcbiAgY3VzdG9tID0gZmFsc2U7XG4gIGlzVmlzaWJsZSA9IHRydWU7XG4gIC8vIFRPRE86IHJlcGxhY2UgNC4wLjMgdy8gZHluYW1pYyBnZXQgdmVyaXNvbiBmcm9tIGVtb2ppLWRhdGFzb3VyY2UgaW4gcGFja2FnZS5qc29uXG4gIEBJbnB1dCgpIGJhY2tncm91bmRJbWFnZUZuOiBFbW9qaVsnYmFja2dyb3VuZEltYWdlRm4nXSA9IERFRkFVTFRfQkFDS0dST1VOREZOO1xuICBASW5wdXQoKSBpbWFnZVVybEZuPzogRW1vamlbJ2ltYWdlVXJsRm4nXTtcblxuICBAVmlld0NoaWxkKCdidXR0b24nLCB7IHN0YXRpYzogZmFsc2UgfSlcbiAgc2V0IGJ1dHRvbihidXR0b246IEVsZW1lbnRSZWY8SFRNTEVsZW1lbnQ+IHwgdW5kZWZpbmVkKSB7XG4gICAgLy8gTm90ZTogYHJ1bk91dHNpZGVBbmd1bGFyYCBpcyB1c2VkIHRvIHRyaWdnZXIgYGFkZEV2ZW50TGlzdGVuZXJgIG91dHNpZGUgb2YgdGhlIEFuZ3VsYXIgem9uZVxuICAgIC8vICAgICAgIHRvby4gU2VlIGBzZXR1cE1vdXNlRW50ZXJMaXN0ZW5lcmAuIFRoZSBgc3dpdGNoTWFwYCB3aWxsIHN1YnNjcmliZSB0byBgZnJvbUV2ZW50YCBjb25zaWRlcmluZ1xuICAgIC8vICAgICAgIHRoZSBjb250ZXh0IHdoZXJlIHRoZSBmYWN0b3J5IGlzIGNhbGxlZCBpbi5cbiAgICB0aGlzLm5nWm9uZS5ydW5PdXRzaWRlQW5ndWxhcigoKSA9PiB0aGlzLmJ1dHRvbiQubmV4dChidXR0b24/Lm5hdGl2ZUVsZW1lbnQpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgc3ViamVjdCB1c2VkIHRvIGVtaXQgd2hlbmV2ZXIgdmlldyBxdWVyaWVzIGFyZSBydW4gYW5kIGBidXR0b25gIG9yIGBzcGFuYCBpcyBzZXQvcmVtb3ZlZC5cbiAgICogV2UgdXNlIHN1YmplY3QgdG8ga2VlcCB0aGUgcmVhY3RpdmUgYmVoYXZpb3Igc28gd2UgZG9uJ3QgaGF2ZSB0byBhZGQgYW5kIHJlbW92ZSBldmVudCBsaXN0ZW5lcnMgbWFudWFsbHkuXG4gICAqL1xuICBwcml2YXRlIHJlYWRvbmx5IGJ1dHRvbiQgPSBuZXcgU3ViamVjdDxIVE1MRWxlbWVudCB8IHVuZGVmaW5lZD4oKTtcblxuICBwcml2YXRlIHJlYWRvbmx5IGRlc3Ryb3kkID0gbmV3IFN1YmplY3Q8dm9pZD4oKTtcblxuICBwcml2YXRlIHJlYWRvbmx5IG5nWm9uZSA9IGluamVjdChOZ1pvbmUpO1xuICBwcml2YXRlIHJlYWRvbmx5IGVtb2ppU2VydmljZSA9IGluamVjdChFbW9qaVNlcnZpY2UpO1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuc2V0dXBNb3VzZUxpc3RlbmVycygpO1xuICB9XG5cbiAgbmdPbkNoYW5nZXMoKSB7XG4gICAgaWYgKCF0aGlzLmVtb2ppKSB7XG4gICAgICByZXR1cm4gKHRoaXMuaXNWaXNpYmxlID0gZmFsc2UpO1xuICAgIH1cbiAgICBjb25zdCBkYXRhID0gdGhpcy5nZXREYXRhKCk7XG4gICAgaWYgKCFkYXRhKSB7XG4gICAgICByZXR1cm4gKHRoaXMuaXNWaXNpYmxlID0gZmFsc2UpO1xuICAgIH1cbiAgICAvLyBjb25zdCBjaGlsZHJlbiA9IHRoaXMuY2hpbGRyZW47XG4gICAgdGhpcy51bmlmaWVkID0gZGF0YS5uYXRpdmUgfHwgbnVsbDtcbiAgICBpZiAoZGF0YS5jdXN0b20pIHtcbiAgICAgIHRoaXMuY3VzdG9tID0gZGF0YS5jdXN0b207XG4gICAgfVxuICAgIGlmICghZGF0YS51bmlmaWVkICYmICFkYXRhLmN1c3RvbSkge1xuICAgICAgcmV0dXJuICh0aGlzLmlzVmlzaWJsZSA9IGZhbHNlKTtcbiAgICB9XG4gICAgaWYgKHRoaXMudG9vbHRpcCkge1xuICAgICAgdGhpcy50aXRsZSA9IGRhdGEuc2hvcnROYW1lc1swXTtcbiAgICB9XG4gICAgaWYgKGRhdGEub2Jzb2xldGVkQnkgJiYgdGhpcy5oaWRlT2Jzb2xldGUpIHtcbiAgICAgIHJldHVybiAodGhpcy5pc1Zpc2libGUgPSBmYWxzZSk7XG4gICAgfVxuXG4gICAgdGhpcy5sYWJlbCA9IFtkYXRhLm5hdGl2ZV0uY29uY2F0KGRhdGEuc2hvcnROYW1lcykuZmlsdGVyKEJvb2xlYW4pLmpvaW4oJywgJyk7XG5cbiAgICBjb25zdCBmbHVlbnRVcmwgPSB0aGlzLmZsdWVudEVtb2ppVXJsO1xuICAgIGlmIChmbHVlbnRVcmwgJiYgIXRoaXMuaXNNaXNzaW5nQXNzZXQoZGF0YS51bmlmaWVkKSkge1xuICAgICAgdGhpcy5zdHlsZSA9IHtcbiAgICAgICAgd2lkdGg6IGAke3RoaXMuc2l6ZX1weGAsXG4gICAgICAgIGhlaWdodDogYCR7dGhpcy5zaXplfXB4YCxcbiAgICAgICAgZGlzcGxheTogJ2lubGluZS1ibG9jaycsXG4gICAgICAgIGJhY2tncm91bmRJbWFnZTogYHVybCgke2ZsdWVudFVybH0pYCxcbiAgICAgICAgYmFja2dyb3VuZFNpemU6ICdjb250YWluJyxcbiAgICAgICAgYmFja2dyb3VuZFJlcGVhdDogJ25vLXJlcGVhdCcsXG4gICAgICAgIGJhY2tncm91bmRQb3NpdGlvbjogJ2NlbnRlcicsXG4gICAgICB9O1xuICAgIH0gZWxzZXtcbiAgICAgIC8vIC0tLSBGQUxMQkFDSyBOQVRJVk8gLS0tXG4gICAgICAvLyBTaSBubyBoYXkgd2VicCBsb2NhbCwgbW9zdHJhbW9zIGVsIGVtb2ppIG5hdGl2byBkZSB0ZXh0byBjb24gZWwgdGFtYcOxbyBjb3JyZWN0b1xuICAgICAgdGhpcy5pc05hdGl2ZSA9IHRydWU7XG4gICAgICB0aGlzLnN0eWxlID0ge1xuICAgICAgICBmb250U2l6ZTogYCR7dGhpcy5zaXplfXB4YCxcbiAgICAgICAgZGlzcGxheTogJ2lubGluZS1ibG9jaycsXG4gICAgICAgIHdpZHRoOiBgJHt0aGlzLnNpemV9cHhgLFxuICAgICAgICBoZWlnaHQ6IGAke3RoaXMuc2l6ZX1weGAsXG4gICAgICAgIHRleHRBbGlnbjogJ2NlbnRlcicsXG4gICAgICAgIGxpbmVIZWlnaHQ6IGAke3RoaXMuc2l6ZX1weGBcbiAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiAodGhpcy5pc1Zpc2libGUgPSB0cnVlKTtcbiAgfVxuXG4gIHByaXZhdGUgaXNNaXNzaW5nQXNzZXQodW5pZmllZD86IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGlmICghdW5pZmllZCkgcmV0dXJuIHRydWU7XG4gICAgY29uc3QgbG93ZXJVbmlmaWVkID0gdW5pZmllZC50b0xvd2VyQ2FzZSgpO1xuICAgIC8vIDEuIEZhbWlsaWFzIGNvbXBsZWphcyBjb24gWldKXG4gICAgY29uc3QgaXNDb21wbGV4RmFtaWx5ID0gbG93ZXJVbmlmaWVkLmluY2x1ZGVzKCcyMDBkJyk7XG4gICAgLy8gMi4gQmFuZGVyYXMgbmFjaW9uYWxlcyBkZSBkb2JsZSBsZXRyYSAoZWouIDFmMWU3LTFmMWYxLCAxZjFlOC0xZjFmNSwgZXRjLilcbiAgICBjb25zdCBpc1JlZ2lvbkZsYWcgPSAvXlsxZjFlMC0xZjFmZl0tWzFmMWUwLTFmMWZmXSQvLnRlc3QobG93ZXJVbmlmaWVkKSB8fCBsb3dlclVuaWZpZWQuaW5jbHVkZXMoJzFmMWUnKTtcbiAgICAvLyAzLiBCYW5kZXJhcyByZWdpb25hbGVzIGVzcGVjaWFsZXMgLyBzdWItbmFjaW9uYWxlcyAoSW5nbGF0ZXJyYSwgRXNjb2NpYSwgR2FsZXMgY29uIGUwMC4uLilcbiAgICBjb25zdCBpc1N1Yk5hdGlvbkZsYWcgPSBsb3dlclVuaWZpZWQuc3RhcnRzV2l0aCgnMWYzZjQnKSB8fCBsb3dlclVuaWZpZWQuaW5jbHVkZXMoJ2UwMCcpO1xuICAgIHJldHVybiBpc0NvbXBsZXhGYW1pbHkgfHwgaXNSZWdpb25GbGFnIHx8IGlzU3ViTmF0aW9uRmxhZztcbiAgfVxuXG5cbiAgbmdPbkRlc3Ryb3koKTogdm9pZCB7XG4gICAgdGhpcy5kZXN0cm95JC5uZXh0KCk7XG4gIH1cblxuICBnZXREYXRhKCkge1xuICAgIHJldHVybiB0aGlzLmVtb2ppU2VydmljZS5nZXREYXRhKHRoaXMuZW1vamksIHRoaXMuc2tpbiwgdGhpcy5zZXQpO1xuICB9XG5cbiAgZ2V0U2FuaXRpemVkRGF0YSgpOiBFbW9qaURhdGEge1xuICAgIHJldHVybiB0aGlzLmVtb2ppU2VydmljZS5nZXRTYW5pdGl6ZWREYXRhKHRoaXMuZW1vamksIHRoaXMuc2tpbiwgdGhpcy5zZXQpIGFzIEVtb2ppRGF0YTtcbiAgfVxuXG4gIHByaXZhdGUgc2V0dXBNb3VzZUxpc3RlbmVycygpOiB2b2lkIHtcbiAgICBjb25zdCBldmVudExpc3RlbmVyJCA9IChldmVudE5hbWU6IHN0cmluZykgPT5cbiAgICAgIHRoaXMuYnV0dG9uJC5waXBlKFxuICAgICAgICAvLyBOb3RlOiBgRU1QVFlgIGlzIHVzZWQgdG8gcmVtb3ZlIGV2ZW50IGxpc3RlbmVyIG9uY2UgdGhlIERPTSBub2RlIGlzIHJlbW92ZWQuXG4gICAgICAgIHN3aXRjaE1hcChidXR0b24gPT4gKGJ1dHRvbiA/IGZyb21FdmVudChidXR0b24sIGV2ZW50TmFtZSkgOiBFTVBUWSkpLFxuICAgICAgICB0YWtlVW50aWwodGhpcy5kZXN0cm95JCksXG4gICAgICApO1xuXG4gICAgZXZlbnRMaXN0ZW5lciQoJ2NsaWNrJykuc3Vic2NyaWJlKCRldmVudCA9PiB7XG4gICAgICBjb25zdCBlbW9qaSA9IHRoaXMuZ2V0U2FuaXRpemVkRGF0YSgpO1xuICAgICAgdGhpcy5lbW9qaUNsaWNrT3V0c2lkZUFuZ3VsYXIuZW1pdCh7IGVtb2ppLCAkZXZlbnQgfSk7XG4gICAgICAvLyBOb3RlOiB0aGlzIGlzIGRvbmUgZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5LiBXZSBydW4gY2hhbmdlIGRldGVjdGlvbiBpZiBkZXZlbG9wZXJzXG4gICAgICAvLyAgICAgICBhcmUgbGlzdGVuaW5nIHRvIGBlbW9qaUNsaWNrYCBpbiB0aGVpciBjb2RlLiBGb3IgaW5zdGFuY2U6XG4gICAgICAvLyAgICAgICBgPG5neC1lbW9qaSAoZW1vamlDbGljayk9XCIuLi5cIj48L25neC1lbW9qaT5gLlxuICAgICAgaWYgKHRoaXMuZW1vamlDbGljay5vYnNlcnZlZCkge1xuICAgICAgICB0aGlzLm5nWm9uZS5ydW4oKCkgPT4gdGhpcy5lbW9qaUNsaWNrLmVtaXQoeyBlbW9qaSwgJGV2ZW50IH0pKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGV2ZW50TGlzdGVuZXIkKCdtb3VzZWVudGVyJykuc3Vic2NyaWJlKCRldmVudCA9PiB7XG4gICAgICBjb25zdCBlbW9qaSA9IHRoaXMuZ2V0U2FuaXRpemVkRGF0YSgpO1xuICAgICAgdGhpcy5lbW9qaU92ZXJPdXRzaWRlQW5ndWxhci5lbWl0KHsgZW1vamksICRldmVudCB9KTtcbiAgICAgIC8vIE5vdGU6IHRoaXMgaXMgZG9uZSBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkuIFdlIHJ1biBjaGFuZ2UgZGV0ZWN0aW9uIGlmIGRldmVsb3BlcnNcbiAgICAgIC8vICAgICAgIGFyZSBsaXN0ZW5pbmcgdG8gYGVtb2ppT3ZlcmAgaW4gdGhlaXIgY29kZS4gRm9yIGluc3RhbmNlOlxuICAgICAgLy8gICAgICAgYDxuZ3gtZW1vamkgKGVtb2ppT3Zlcik9XCIuLi5cIj48L25neC1lbW9qaT5gLlxuICAgICAgaWYgKHRoaXMuZW1vamlPdmVyLm9ic2VydmVkKSB7XG4gICAgICAgIHRoaXMubmdab25lLnJ1bigoKSA9PiB0aGlzLmVtb2ppT3Zlci5lbWl0KHsgZW1vamksICRldmVudCB9KSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBldmVudExpc3RlbmVyJCgnbW91c2VsZWF2ZScpLnN1YnNjcmliZSgkZXZlbnQgPT4ge1xuICAgICAgY29uc3QgZW1vamkgPSB0aGlzLmdldFNhbml0aXplZERhdGEoKTtcbiAgICAgIHRoaXMuZW1vamlMZWF2ZU91dHNpZGVBbmd1bGFyLmVtaXQoeyBlbW9qaSwgJGV2ZW50IH0pO1xuICAgICAgLy8gTm90ZTogdGhpcyBpcyBkb25lIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eS4gV2UgcnVuIGNoYW5nZSBkZXRlY3Rpb24gaWYgZGV2ZWxvcGVyc1xuICAgICAgLy8gICAgICAgYXJlIGxpc3RlbmluZyB0byBgZW1vamlMZWF2ZWAgaW4gdGhlaXIgY29kZS4gRm9yIGluc3RhbmNlOlxuICAgICAgLy8gICAgICAgYDxuZ3gtZW1vamkgKGVtb2ppTGVhdmUpPVwiLi4uXCI+PC9uZ3gtZW1vamk+YC5cbiAgICAgIGlmICh0aGlzLmVtb2ppTGVhdmUub2JzZXJ2ZWQpIHtcbiAgICAgICAgdGhpcy5uZ1pvbmUucnVuKCgpID0+IHRoaXMuZW1vamlMZWF2ZS5lbWl0KHsgZW1vamksICRldmVudCB9KSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==