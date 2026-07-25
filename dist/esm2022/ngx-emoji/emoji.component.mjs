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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1vamkuY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9waWNrZXIvbmd4LWVtb2ppL2Vtb2ppLmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxpQkFBaUI7QUFDakIsT0FBTyxFQUNMLHVCQUF1QixFQUN2QixTQUFTLEVBRVQsWUFBWSxFQUNaLEtBQUssRUFDTCxNQUFNLEVBR04sTUFBTSxFQUNOLFNBQVMsRUFDVCxNQUFNLEdBQ1AsTUFBTSxlQUFlLENBQUM7QUFDdkIsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBR3ZFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxZQUFZLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQzs7O0FBMEJyRSxNQThDYSxjQUFjO0lBRXpCLElBQUksY0FBYztRQUNoQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDNUIsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPO1lBQUUsT0FBTyxJQUFJLENBQUM7UUFDeEMsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNuRCxPQUFPLHVCQUF1QixlQUFlLE9BQU8sQ0FBQztJQUN2RCxDQUFDO0lBRUQsSUFBSSxnQkFBZ0I7UUFDbEIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQztRQUNoQyxJQUFJLENBQUMsR0FBRztZQUFFLE9BQU8sSUFBSSxDQUFDO1FBQ3RCLE9BQU87WUFDTCxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxJQUFJO1lBQ3ZCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLElBQUk7WUFDeEIsT0FB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Ozs7Ozs7Ozs7Ozs7Ozs7R0FzQ1QsMkRBSVMsWUFBWTs7U0FFWCxjQUFjOzJGQUFkLGNBQWM7a0JBOUMxQixTQUFTO21CQUFDO29CQUNULFFBQVEsRUFBRSxXQUFXO29CQUNyQixRQUFRLEVBQUU7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBc0NUO29CQUNELGVBQWUsRUFBRSx1QkFBdUIsQ0FBQyxNQUFNO29CQUMvQyxtQkFBbUIsRUFBRSxLQUFLO29CQUMxQixVQUFVLEVBQUUsSUFBSTtvQkFDaEIsT0FBTyxFQUFFLENBQUMsWUFBWSxDQUFDO2lCQUN4QjswRUF5QlUsSUFBSTtzQkFBWixLQUFLO2dCQUNHLEdBQUc7c0JBQVgsS0FBSztnQkFDRyxTQUFTO3NCQUFqQixLQUFLO2dCQUVHLFFBQVE7c0JBQWhCLEtBQUs7Z0JBQ0csU0FBUztzQkFBakIsS0FBSztnQkFDRyxPQUFPO3NCQUFmLEtBQUs7Z0JBQ0csSUFBSTtzQkFBWixLQUFLO2dCQUNHLEtBQUs7c0JBQWIsS0FBSztnQkFDRyxRQUFRO3NCQUFoQixLQUFLO2dCQUNHLFlBQVk7c0JBQXBCLEtBQUs7Z0JBQ0csU0FBUztzQkFBakIsS0FBSztnQkFDRyxZQUFZO3NCQUFwQixLQUFLO2dCQUNHLFNBQVM7c0JBQWpCLEtBQUs7Z0JBT0ksU0FBUztzQkFBbEIsTUFBTTtnQkFDRyx1QkFBdUI7c0JBQWhDLE1BQU07Z0JBRUcsVUFBVTtzQkFBbkIsTUFBTTtnQkFDRyx3QkFBd0I7c0JBQWpDLE1BQU07Z0JBQ0csVUFBVTtzQkFBbkIsTUFBTTtnQkFDRyx3QkFBd0I7c0JBQWpDLE1BQU07Z0JBU0UsaUJBQWlCO3NCQUF6QixLQUFLO2dCQUNHLFVBQVU7c0JBQWxCLEtBQUs7Z0JBR0YsTUFBTTtzQkFEVCxTQUFTO3VCQUFDLFFBQVEsRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBtb2RpZmljYWNpb24gN1xuaW1wb3J0IHtcbiAgQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3ksXG4gIENvbXBvbmVudCxcbiAgRWxlbWVudFJlZixcbiAgRXZlbnRFbWl0dGVyLFxuICBJbnB1dCxcbiAgTmdab25lLFxuICBPbkNoYW5nZXMsXG4gIE9uRGVzdHJveSxcbiAgT3V0cHV0LFxuICBWaWV3Q2hpbGQsXG4gIGluamVjdCxcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBDb21tb25Nb2R1bGUgfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHsgRU1QVFksIFN1YmplY3QsIGZyb21FdmVudCwgc3dpdGNoTWFwLCB0YWtlVW50aWwgfSBmcm9tICdyeGpzJztcblxuaW1wb3J0IHsgRW1vamlEYXRhIH0gZnJvbSAnLi9kYXRhL2RhdGEuaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBERUZBVUxUX0JBQ0tHUk9VTkRGTiwgRW1vamlTZXJ2aWNlIH0gZnJvbSAnLi9lbW9qaS5zZXJ2aWNlJztcblxuZXhwb3J0IGludGVyZmFjZSBFbW9qaSB7XG4gIC8qKiBSZW5kZXJzIHRoZSBuYXRpdmUgdW5pY29kZSBlbW9qaSAqL1xuICBpc05hdGl2ZTogYm9vbGVhbjtcbiAgZm9yY2VTaXplOiBib29sZWFuO1xuICB0b29sdGlwOiBib29sZWFuO1xuICBza2luOiAxIHwgMiB8IDMgfCA0IHwgNSB8IDY7XG4gIHNoZWV0U2l6ZTogMTYgfCAyMCB8IDMyIHwgNjQgfCA3MjtcbiAgc2hlZXRSb3dzPzogbnVtYmVyO1xuICBzZXQ6ICdhcHBsZScgfCAnZ29vZ2xlJyB8ICd0d2l0dGVyJyB8ICdmYWNlYm9vaycgfCAnJztcbiAgc2l6ZTogbnVtYmVyO1xuICBlbW9qaTogc3RyaW5nIHwgRW1vamlEYXRhO1xuICBiYWNrZ3JvdW5kSW1hZ2VGbjogKHNldDogc3RyaW5nLCBzaGVldFNpemU6IG51bWJlcikgPT4gc3RyaW5nO1xuICBmYWxsYmFjaz86IChkYXRhOiBhbnksIHByb3BzOiBhbnkpID0+IHN0cmluZztcbiAgZW1vamlPdmVyOiBFdmVudEVtaXR0ZXI8RW1vamlFdmVudD47XG4gIGVtb2ppTGVhdmU6IEV2ZW50RW1pdHRlcjxFbW9qaUV2ZW50PjtcbiAgZW1vamlDbGljazogRXZlbnRFbWl0dGVyPEVtb2ppRXZlbnQ+O1xuICBpbWFnZVVybEZuPzogKGVtb2ppOiBFbW9qaURhdGEgfCBudWxsKSA9PiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRW1vamlFdmVudCB7XG4gIGVtb2ppOiBFbW9qaURhdGE7XG4gICRldmVudDogRXZlbnQ7XG59XG5cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ25neC1lbW9qaScsXG4gIHRlbXBsYXRlOiBgXG4gICAgPG5nLXRlbXBsYXRlIFtuZ0lmXT1cImlzVmlzaWJsZVwiPlxuICAgICAgPGJ1dHRvblxuICAgICAgICAqbmdJZj1cInVzZUJ1dHRvbjsgZWxzZSBzcGFuVHBsXCJcbiAgICAgICAgI2J1dHRvblxuICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgW2F0dHIudGl0bGVdPVwidGl0bGVcIlxuICAgICAgICBbYXR0ci5hcmlhLWxhYmVsXT1cImxhYmVsXCJcbiAgICAgICAgY2xhc3M9XCJlbW9qaS1tYXJ0LWVtb2ppXCJcbiAgICAgICAgW2NsYXNzLmVtb2ppLW1hcnQtZW1vamktbmF0aXZlXT1cImlzTmF0aXZlXCJcbiAgICAgICAgW2NsYXNzLmVtb2ppLW1hcnQtZW1vamktY3VzdG9tXT1cImN1c3RvbVwiXG4gICAgICA+XG4gICAgICAgIDxzcGFuIHN0eWxlPVwiZGlzcGxheTogZmxleDsgYWxpZ24taXRlbXM6IGNlbnRlcjsganVzdGlmeS1jb250ZW50OiBjZW50ZXI7IHdpZHRoOiAxMDAlOyBoZWlnaHQ6IDEwMCU7XCI+XG4gICAgICAgICAgPHNwYW4gKm5nSWY9XCIhaXNOYXRpdmUgJiYgZmx1ZW50VXJsOyBlbHNlIG5hdGl2ZVRleHRcIiBbbmdTdHlsZV09XCJzdHlsZVwiPjwvc3Bhbj5cbiAgICAgICAgICA8bmctdGVtcGxhdGUgI25hdGl2ZVRleHQ+XG4gICAgICAgICAgICA8c3BhbiBbc3R5bGUuZm9udC1zaXplLnB4XT1cInNpemVcIj57eyB1bmlmaWVkVGV4dCB9fTwvc3Bhbj5cbiAgICAgICAgICA8L25nLXRlbXBsYXRlPlxuICAgICAgICA8L3NwYW4+XG4gICAgICA8L2J1dHRvbj5cbiAgICA8L25nLXRlbXBsYXRlPlxuXG4gICAgPG5nLXRlbXBsYXRlICNzcGFuVHBsPlxuICAgICAgPHNwYW5cbiAgICAgICAgI2J1dHRvblxuICAgICAgICBbYXR0ci50aXRsZV09XCJ0aXRsZVwiXG4gICAgICAgIFthdHRyLmFyaWEtbGFiZWxdPVwibGFiZWxcIlxuICAgICAgICBjbGFzcz1cImVtb2ppLW1hcnQtZW1vamlcIlxuICAgICAgICBbY2xhc3MuZW1vamktbWFydC1lbW9qaS1uYXRpdmVdPVwiaXNOYXRpdmVcIlxuICAgICAgICBbY2xhc3MuZW1vamktbWFydC1lbW9qaS1jdXN0b21dPVwiY3VzdG9tXCJcbiAgICAgID5cbiAgICAgICAgPHNwYW4gc3R5bGU9XCJkaXNwbGF5OiBmbGV4OyBhbGlnbi1pdGVtczogY2VudGVyOyBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjsgd2lkdGg6IDEwMCU7IGhlaWdodDogMTAwJTtcIj5cbiAgICAgICAgICA8c3BhbiAqbmdJZj1cIiFpc05hdGl2ZSAmJiBmbHVlbnRVcmw7IGVsc2UgbmF0aXZlVGV4dFwiIFtuZ1N0eWxlXT1cInN0eWxlXCI+PC9zcGFuPlxuICAgICAgICAgIDxuZy10ZW1wbGF0ZSAjbmF0aXZlVGV4dD5cbiAgICAgICAgICAgIDxzcGFuIFtzdHlsZS5mb250LXNpemUucHhdPVwic2l6ZVwiPnt7IHVuaWZpZWRUZXh0IH19PC9zcGFuPlxuICAgICAgICAgIDwvbmctdGVtcGxhdGU+XG4gICAgICAgIDwvc3Bhbj5cbiAgICAgIDwvc3Bhbj5cbiAgICA8L25nLXRlbXBsYXRlPlxuICBgLFxuICBjaGFuZ2VEZXRlY3Rpb246IENoYW5nZURldGVjdGlvblN0cmF0ZWd5Lk9uUHVzaCxcbiAgcHJlc2VydmVXaGl0ZXNwYWNlczogZmFsc2UsXG4gIHN0YW5kYWxvbmU6IHRydWUsXG4gIGltcG9ydHM6IFtDb21tb25Nb2R1bGVdLFxufSlcbmV4cG9ydCBjbGFzcyBFbW9qaUNvbXBvbmVudCBpbXBsZW1lbnRzIE9uQ2hhbmdlcywgRW1vamksIE9uRGVzdHJveSB7XG5cbiAgZ2V0IGZsdWVudEVtb2ppVXJsKCk6IHN0cmluZyB8IG51bGwge1xuICAgIGNvbnN0IGRhdGEgPSB0aGlzLmdldERhdGEoKTtcbiAgICBpZiAoIWRhdGEgfHwgIWRhdGEudW5pZmllZCkgcmV0dXJuIG51bGw7XG4gICAgY29uc3QgY29kaWdvVW5pZmljYWRvID0gZGF0YS51bmlmaWVkLnRvTG93ZXJDYXNlKCk7XG4gICAgcmV0dXJuIGBhc3NldHMvZmx1ZW50LWVtb2ppLyR7Y29kaWdvVW5pZmljYWRvfS53ZWJwYDtcbiAgfVxuXG4gIGdldCBmbHVlbnRFbW9qaVN0eWxlKCk6IGFueSB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5mbHVlbnRFbW9qaVVybDtcbiAgICBpZiAoIXVybCkgcmV0dXJuIG51bGw7XG4gICAgcmV0dXJuIHtcbiAgICAgIHdpZHRoOiBgJHt0aGlzLnNpemV9cHhgLFxuICAgICAgaGVpZ2h0OiBgJHt0aGlzLnNpemV9cHhgLFxuICAgICAgZGlzcGxheTogJ2lubGluZS1ibG9jaycsXG4gICAgICBiYWNrZ3JvdW5kSW1hZ2U6IGB1cmwoJHt1cmx9KWAsXG4gICAgICBiYWNrZ3JvdW5kU2l6ZTogJ2NvbnRhaW4nLFxuICAgICAgYmFja2dyb3VuZFJlcGVhdDogJ25vLXJlcGVhdCcsXG4gICAgICBiYWNrZ3JvdW5kUG9zaXRpb246ICdjZW50ZXInLFxuICAgIH07XG4gIH1cblxuXG4gIEBJbnB1dCgpIHNraW46IEVtb2ppWydza2luJ10gPSAxO1xuICBASW5wdXQoKSBzZXQ6IEVtb2ppWydzZXQnXSA9ICdhcHBsZSc7XG4gIEBJbnB1dCgpIHNoZWV0U2l6ZTogRW1vamlbJ3NoZWV0U2l6ZSddID0gNjQ7XG4gIC8qKiBSZW5kZXJzIHRoZSBuYXRpdmUgdW5pY29kZSBlbW9qaSAqL1xuICBASW5wdXQoKSBpc05hdGl2ZTogRW1vamlbJ2lzTmF0aXZlJ10gPSBmYWxzZTtcbiAgQElucHV0KCkgZm9yY2VTaXplOiBFbW9qaVsnZm9yY2VTaXplJ10gPSBmYWxzZTtcbiAgQElucHV0KCkgdG9vbHRpcDogRW1vamlbJ3Rvb2x0aXAnXSA9IGZhbHNlO1xuICBASW5wdXQoKSBzaXplOiBFbW9qaVsnc2l6ZSddID0gMjQ7XG4gIEBJbnB1dCgpIGVtb2ppOiBFbW9qaVsnZW1vamknXSA9ICcnO1xuICBASW5wdXQoKSBmYWxsYmFjaz86IEVtb2ppWydmYWxsYmFjayddO1xuICBASW5wdXQoKSBoaWRlT2Jzb2xldGUgPSBmYWxzZTtcbiAgQElucHV0KCkgc2hlZXRSb3dzPzogbnVtYmVyO1xuICBASW5wdXQoKSBzaGVldENvbHVtbnM/OiBudW1iZXI7XG4gIEBJbnB1dCgpIHVzZUJ1dHRvbj86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBOb3RlOiBgZW1vamlPdmVyYCBhbmQgYGVtb2ppT3Zlck91dHNpZGVBbmd1bGFyYCBhcmUgZGlzcGF0Y2hlZCBvbiB0aGUgc2FtZSBldmVudCAoYG1vdXNlZW50ZXJgKSwgYnV0XG4gICAqICAgICAgIGZvciBkaWZmZXJlbnQgcHVycG9zZXMuIFRoZSBgZW1vamlPdmVyT3V0c2lkZUFuZ3VsYXJgIGV2ZW50IGlzIGxpc3RlbmVkIG9ubHkgaW4gYGVtb2ppLWNhdGVnb3J5YFxuICAgKiAgICAgICBjb21wb25lbnQgYW5kIHRoZSBjYXRlZ29yeSBjb21wb25lbnQgZG9lc24ndCBjYXJlIGFib3V0IHpvbmUgY29udGV4dCB0aGUgY2FsbGJhY2sgaXMgYmVpbmcgY2FsbGVkIGluLlxuICAgKiAgICAgICBUaGUgYGVtb2ppT3ZlcmAgaXMgZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5IGlmIGFueW9uZSBpcyBsaXN0ZW5pbmcgdG8gdGhpcyBldmVudCBleHBsaWNpdGx5IGluIHRoZWlyIGNvZGUuXG4gICAqL1xuICBAT3V0cHV0KCkgZW1vamlPdmVyOiBFbW9qaVsnZW1vamlPdmVyJ10gPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gIEBPdXRwdXQoKSBlbW9qaU92ZXJPdXRzaWRlQW5ndWxhcjogRW1vamlbJ2Vtb2ppT3ZlciddID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICAvKiogU2VlIGNvbW1lbnRzIGFib3ZlLCB0aGlzIHNlcnZlcyB0aGUgc2FtZSBwdXJwb3NlLiAqL1xuICBAT3V0cHV0KCkgZW1vamlMZWF2ZTogRW1vamlbJ2Vtb2ppTGVhdmUnXSA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgQE91dHB1dCgpIGVtb2ppTGVhdmVPdXRzaWRlQW5ndWxhcjogRW1vamlbJ2Vtb2ppTGVhdmUnXSA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgQE91dHB1dCgpIGVtb2ppQ2xpY2s6IEVtb2ppWydlbW9qaUNsaWNrJ10gPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gIEBPdXRwdXQoKSBlbW9qaUNsaWNrT3V0c2lkZUFuZ3VsYXI6IEVtb2ppWydlbW9qaUNsaWNrJ10gPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG5cbiAgc3R5bGU6IGFueTtcbiAgdGl0bGU/OiBzdHJpbmcgPSB1bmRlZmluZWQ7XG4gIGxhYmVsID0gJyc7XG4gIHVuaWZpZWQ/OiBzdHJpbmcgfCBudWxsO1xuICBjdXN0b20gPSBmYWxzZTtcbiAgaXNWaXNpYmxlID0gdHJ1ZTtcbiAgLy8gVE9ETzogcmVwbGFjZSA0LjAuMyB3LyBkeW5hbWljIGdldCB2ZXJpc29uIGZyb20gZW1vamktZGF0YXNvdXJjZSBpbiBwYWNrYWdlLmpzb25cbiAgQElucHV0KCkgYmFja2dyb3VuZEltYWdlRm46IEVtb2ppWydiYWNrZ3JvdW5kSW1hZ2VGbiddID0gREVGQVVMVF9CQUNLR1JPVU5ERk47XG4gIEBJbnB1dCgpIGltYWdlVXJsRm4/OiBFbW9qaVsnaW1hZ2VVcmxGbiddO1xuXG4gIEBWaWV3Q2hpbGQoJ2J1dHRvbicsIHsgc3RhdGljOiBmYWxzZSB9KVxuICBzZXQgYnV0dG9uKGJ1dHRvbjogRWxlbWVudFJlZjxIVE1MRWxlbWVudD4gfCB1bmRlZmluZWQpIHtcbiAgICAvLyBOb3RlOiBgcnVuT3V0c2lkZUFuZ3VsYXJgIGlzIHVzZWQgdG8gdHJpZ2dlciBgYWRkRXZlbnRMaXN0ZW5lcmAgb3V0c2lkZSBvZiB0aGUgQW5ndWxhciB6b25lXG4gICAgLy8gICAgICAgdG9vLiBTZWUgYHNldHVwTW91c2VFbnRlckxpc3RlbmVyYC4gVGhlIGBzd2l0Y2hNYXBgIHdpbGwgc3Vic2NyaWJlIHRvIGBmcm9tRXZlbnRgIGNvbnNpZGVyaW5nXG4gICAgLy8gICAgICAgdGhlIGNvbnRleHQgd2hlcmUgdGhlIGZhY3RvcnkgaXMgY2FsbGVkIGluLlxuICAgIHRoaXMubmdab25lLnJ1bk91dHNpZGVBbmd1bGFyKCgpID0+IHRoaXMuYnV0dG9uJC5uZXh0KGJ1dHRvbj8ubmF0aXZlRWxlbWVudCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBzdWJqZWN0IHVzZWQgdG8gZW1pdCB3aGVuZXZlciB2aWV3IHF1ZXJpZXMgYXJlIHJ1biBhbmQgYGJ1dHRvbmAgb3IgYHNwYW5gIGlzIHNldC9yZW1vdmVkLlxuICAgKiBXZSB1c2Ugc3ViamVjdCB0byBrZWVwIHRoZSByZWFjdGl2ZSBiZWhhdmlvciBzbyB3ZSBkb24ndCBoYXZlIHRvIGFkZCBhbmQgcmVtb3ZlIGV2ZW50IGxpc3RlbmVycyBtYW51YWxseS5cbiAgICovXG4gIHByaXZhdGUgcmVhZG9ubHkgYnV0dG9uJCA9IG5ldyBTdWJqZWN0PEhUTUxFbGVtZW50IHwgdW5kZWZpbmVkPigpO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgZGVzdHJveSQgPSBuZXcgU3ViamVjdDx2b2lkPigpO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgbmdab25lID0gaW5qZWN0KE5nWm9uZSk7XG4gIHByaXZhdGUgcmVhZG9ubHkgZW1vamlTZXJ2aWNlID0gaW5qZWN0KEVtb2ppU2VydmljZSk7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5zZXR1cE1vdXNlTGlzdGVuZXJzKCk7XG4gIH1cblxuXG51bmlmaWVkVGV4dD86IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICBmbHVlbnRVcmw6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuXG4gIG5nT25DaGFuZ2VzKCkge1xuICAgIGlmICghdGhpcy5lbW9qaSkge1xuICAgICAgcmV0dXJuICh0aGlzLmlzVmlzaWJsZSA9IGZhbHNlKTtcbiAgICB9XG4gICAgY29uc3QgZGF0YSA9IHRoaXMuZ2V0RGF0YSgpO1xuICAgIGlmICghZGF0YSkge1xuICAgICAgcmV0dXJuICh0aGlzLmlzVmlzaWJsZSA9IGZhbHNlKTtcbiAgICB9XG5cbiAgICB0aGlzLnVuaWZpZWRUZXh0ID0gZGF0YS5uYXRpdmUgfHwgbnVsbDtcbiAgICBpZiAoZGF0YS5jdXN0b20pIHtcbiAgICAgIHRoaXMuY3VzdG9tID0gZGF0YS5jdXN0b207XG4gICAgfVxuICAgIGlmICghZGF0YS51bmlmaWVkICYmICFkYXRhLmN1c3RvbSkge1xuICAgICAgcmV0dXJuICh0aGlzLmlzVmlzaWJsZSA9IGZhbHNlKTtcbiAgICB9XG4gICAgaWYgKHRoaXMudG9vbHRpcCkge1xuICAgICAgdGhpcy50aXRsZSA9IGRhdGEuc2hvcnROYW1lc1swXTtcbiAgICB9XG4gICAgaWYgKGRhdGEub2Jzb2xldGVkQnkgJiYgdGhpcy5oaWRlT2Jzb2xldGUpIHtcbiAgICAgIHJldHVybiAodGhpcy5pc1Zpc2libGUgPSBmYWxzZSk7XG4gICAgfVxuXG4gICAgdGhpcy5sYWJlbCA9IFtkYXRhLm5hdGl2ZV0uY29uY2F0KGRhdGEuc2hvcnROYW1lcykuZmlsdGVyKEJvb2xlYW4pLmpvaW4oJywgJyk7XG5cbiAgICAvLyBWZXJpZmljYW1vcyBzaSBlcyB1bmEgZmFtaWxpYSBjb21wbGVqYSBjb24gWldKIHF1ZSBzYWJlbW9zIHF1ZSBubyB0aWVuZSBhc3NldFxuICAgIGNvbnN0IGlzQ29tcGxleEZhbWlseSA9IGRhdGEudW5pZmllZCAmJiBkYXRhLnVuaWZpZWQuaW5jbHVkZXMoJzIwMGQnKTtcblxuICAgIGNvbnN0IGZsdWVudFVybCA9IHRoaXMuZmx1ZW50RW1vamlVcmw7XG4gICAgaWYgKGZsdWVudFVybCAmJiAhdGhpcy5pc01pc3NpbmdBc3NldChkYXRhLnVuaWZpZWQpKSB7XG4gICAgICB0aGlzLnN0eWxlID0ge1xuICAgICAgICB3aWR0aDogYCR7dGhpcy5zaXplfXB4YCxcbiAgICAgICAgaGVpZ2h0OiBgJHt0aGlzLnNpemV9cHhgLFxuICAgICAgICBkaXNwbGF5OiAnaW5saW5lLWJsb2NrJyxcbiAgICAgICAgYmFja2dyb3VuZEltYWdlOiBgdXJsKCR7Zmx1ZW50VXJsfSlgLFxuICAgICAgICBiYWNrZ3JvdW5kU2l6ZTogJ2NvbnRhaW4nLFxuICAgICAgICBiYWNrZ3JvdW5kUmVwZWF0OiAnbm8tcmVwZWF0JyxcbiAgICAgICAgYmFja2dyb3VuZFBvc2l0aW9uOiAnY2VudGVyJyxcbiAgICAgIH07XG4gICAgfSBlbHNle1xuICAgICAgLy8gLS0tIEZBTExCQUNLIE5BVElWTyAtLS1cbiAgICAgIC8vIFNpIG5vIGhheSB3ZWJwIGxvY2FsLCBtb3N0cmFtb3MgZWwgZW1vamkgbmF0aXZvIGRlIHRleHRvIGNvbiBlbCB0YW1hw7FvIGNvcnJlY3RvXG4gICAgICB0aGlzLmlzTmF0aXZlID0gdHJ1ZTtcbiAgICAgIHRoaXMuc3R5bGUgPSB7XG4gICAgICAgIGZvbnRTaXplOiBgJHt0aGlzLnNpemV9cHhgLFxuICAgICAgICBkaXNwbGF5OiAnaW5saW5lLWJsb2NrJyxcbiAgICAgICAgd2lkdGg6IGAke3RoaXMuc2l6ZX1weGAsXG4gICAgICAgIGhlaWdodDogYCR7dGhpcy5zaXplfXB4YCxcbiAgICAgICAgdGV4dEFsaWduOiAnY2VudGVyJyxcbiAgICAgICAgbGluZUhlaWdodDogYCR7dGhpcy5zaXplfXB4YFxuICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gKHRoaXMuaXNWaXNpYmxlID0gdHJ1ZSk7XG4gIH1cblxuXG5cbnByaXZhdGUgaXNNaXNzaW5nQXNzZXQodW5pZmllZD86IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGlmICghdW5pZmllZCkgcmV0dXJuIHRydWU7XG4gICAgY29uc3QgbG93ZXJVbmlmaWVkID0gdW5pZmllZC50b0xvd2VyQ2FzZSgpO1xuXG4gICAgLy8gTGlzdGFkbyBleGFjdG8gZGUgbG9zIHVuaWZpY2Fkb3MgcXVlIHNhYmVtb3MgcXVlIG5vIHRpZW5lbiAud2VicCBsb2NhbFxuICAgIGNvbnN0IG1pc3NpbmdBc3NldHMgPSBuZXcgU2V0KFtcbiAgICAgICcxZjQ2OC0yMDBkLTFmNDY4LTIwMGQtMWY0NjctMjAwZC0xZjQ2NicsXG4gICAgICAnMWY0NjktMjAwZC0xZjQ2OS0yMDBkLTFmNDY3LTIwMGQtMWY0NjYnLFxuICAgICAgJzFmMWU3LTFmMWYxJyxcbiAgICAgICcxZjFlNy0xZjFmNicsXG4gICAgICAnMWYxZTctMWYxZmInLFxuICAgICAgJzFmMWU4LTFmMWY1JyxcbiAgICAgICcxZjFlOS0xZjFlYycsXG4gICAgICAnMWYxZWEtMWYxZTYnLFxuICAgICAgJzFmMWYyLTFmMWViJyxcbiAgICAgICcxZjFlZC0xZjFmMicsXG4gICAgICAnMWYxZjctMWYxZWEnLFxuICAgICAgJzFmMWY4LTFmMWVmJyxcbiAgICAgICcxZjFmOS0xZjFlOScsXG4gICAgICAnMWYxZjktMWYxZWInLFxuICAgICAgJzFmMWZhLTFmMWYyJyxcbiAgICAgICcxZjNmNC1lMDA2Ny1lMDA2Mi1lMDA2NS1lMDA2ZS1lMDA2Ny1lMDA3ZicsIC8vIEluZ2xhdGVycmFcbiAgICAgICcxZjNmNC1lMDA2Ny1lMDA2Mi1lMDA3My1lMDA2My1lMDA3NC1lMDA3ZicsIC8vIEVzY29jaWFcbiAgICAgICcxZjNmNC1lMDA2Ny1lMDA2Mi1lMDA3Ny1lMDA2Yy1lMDA3My1lMDA3ZicgIC8vIEdhbGVzXG4gICAgXSk7XG5cbiAgICBpZiAobWlzc2luZ0Fzc2V0cy5oYXMobG93ZXJVbmlmaWVkKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gUGF0csOzbiBnZW7DqXJpY28gcG9yIHNpIGFwYXJlY2UgYWxndW5hIG90cmEgdmFyaWFudGUgY29uIFpXSlxuICAgIHJldHVybiBsb3dlclVuaWZpZWQuaW5jbHVkZXMoJzIwMGQnKTtcbiAgfVxuXG5cbiAgbmdPbkRlc3Ryb3koKTogdm9pZCB7XG4gICAgdGhpcy5kZXN0cm95JC5uZXh0KCk7XG4gIH1cblxuICBnZXREYXRhKCkge1xuICAgIHJldHVybiB0aGlzLmVtb2ppU2VydmljZS5nZXREYXRhKHRoaXMuZW1vamksIHRoaXMuc2tpbiwgdGhpcy5zZXQpO1xuICB9XG5cbiAgZ2V0U2FuaXRpemVkRGF0YSgpOiBFbW9qaURhdGEge1xuICAgIHJldHVybiB0aGlzLmVtb2ppU2VydmljZS5nZXRTYW5pdGl6ZWREYXRhKHRoaXMuZW1vamksIHRoaXMuc2tpbiwgdGhpcy5zZXQpIGFzIEVtb2ppRGF0YTtcbiAgfVxuXG4gIHByaXZhdGUgc2V0dXBNb3VzZUxpc3RlbmVycygpOiB2b2lkIHtcbiAgICBjb25zdCBldmVudExpc3RlbmVyJCA9IChldmVudE5hbWU6IHN0cmluZykgPT5cbiAgICAgIHRoaXMuYnV0dG9uJC5waXBlKFxuICAgICAgICAvLyBOb3RlOiBgRU1QVFlgIGlzIHVzZWQgdG8gcmVtb3ZlIGV2ZW50IGxpc3RlbmVyIG9uY2UgdGhlIERPTSBub2RlIGlzIHJlbW92ZWQuXG4gICAgICAgIHN3aXRjaE1hcChidXR0b24gPT4gKGJ1dHRvbiA/IGZyb21FdmVudChidXR0b24sIGV2ZW50TmFtZSkgOiBFTVBUWSkpLFxuICAgICAgICB0YWtlVW50aWwodGhpcy5kZXN0cm95JCksXG4gICAgICApO1xuXG4gICAgZXZlbnRMaXN0ZW5lciQoJ2NsaWNrJykuc3Vic2NyaWJlKCRldmVudCA9PiB7XG4gICAgICBjb25zdCBlbW9qaSA9IHRoaXMuZ2V0U2FuaXRpemVkRGF0YSgpO1xuICAgICAgdGhpcy5lbW9qaUNsaWNrT3V0c2lkZUFuZ3VsYXIuZW1pdCh7IGVtb2ppLCAkZXZlbnQgfSk7XG4gICAgICAvLyBOb3RlOiB0aGlzIGlzIGRvbmUgZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5LiBXZSBydW4gY2hhbmdlIGRldGVjdGlvbiBpZiBkZXZlbG9wZXJzXG4gICAgICAvLyAgICAgICBhcmUgbGlzdGVuaW5nIHRvIGBlbW9qaUNsaWNrYCBpbiB0aGVpciBjb2RlLiBGb3IgaW5zdGFuY2U6XG4gICAgICAvLyAgICAgICBgPG5neC1lbW9qaSAoZW1vamlDbGljayk9XCIuLi5cIj48L25neC1lbW9qaT5gLlxuICAgICAgaWYgKHRoaXMuZW1vamlDbGljay5vYnNlcnZlZCkge1xuICAgICAgICB0aGlzLm5nWm9uZS5ydW4oKCkgPT4gdGhpcy5lbW9qaUNsaWNrLmVtaXQoeyBlbW9qaSwgJGV2ZW50IH0pKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGV2ZW50TGlzdGVuZXIkKCdtb3VzZWVudGVyJykuc3Vic2NyaWJlKCRldmVudCA9PiB7XG4gICAgICBjb25zdCBlbW9qaSA9IHRoaXMuZ2V0U2FuaXRpemVkRGF0YSgpO1xuICAgICAgdGhpcy5lbW9qaU92ZXJPdXRzaWRlQW5ndWxhci5lbWl0KHsgZW1vamksICRldmVudCB9KTtcbiAgICAgIC8vIE5vdGU6IHRoaXMgaXMgZG9uZSBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkuIFdlIHJ1biBjaGFuZ2UgZGV0ZWN0aW9uIGlmIGRldmVsb3BlcnNcbiAgICAgIC8vICAgICAgIGFyZSBsaXN0ZW5pbmcgdG8gYGVtb2ppT3ZlcmAgaW4gdGhlaXIgY29kZS4gRm9yIGluc3RhbmNlOlxuICAgICAgLy8gICAgICAgYDxuZ3gtZW1vamkgKGVtb2ppT3Zlcik9XCIuLi5cIj48L25neC1lbW9qaT5gLlxuICAgICAgaWYgKHRoaXMuZW1vamlPdmVyLm9ic2VydmVkKSB7XG4gICAgICAgIHRoaXMubmdab25lLnJ1bigoKSA9PiB0aGlzLmVtb2ppT3Zlci5lbWl0KHsgZW1vamksICRldmVudCB9KSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBldmVudExpc3RlbmVyJCgnbW91c2VsZWF2ZScpLnN1YnNjcmliZSgkZXZlbnQgPT4ge1xuICAgICAgY29uc3QgZW1vamkgPSB0aGlzLmdldFNhbml0aXplZERhdGEoKTtcbiAgICAgIHRoaXMuZW1vamlMZWF2ZU91dHNpZGVBbmd1bGFyLmVtaXQoeyBlbW9qaSwgJGV2ZW50IH0pO1xuICAgICAgLy8gTm90ZTogdGhpcyBpcyBkb25lIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eS4gV2UgcnVuIGNoYW5nZSBkZXRlY3Rpb24gaWYgZGV2ZWxvcGVyc1xuICAgICAgLy8gICAgICAgYXJlIGxpc3RlbmluZyB0byBgZW1vamlMZWF2ZWAgaW4gdGhlaXIgY29kZS4gRm9yIGluc3RhbmNlOlxuICAgICAgLy8gICAgICAgYDxuZ3gtZW1vamkgKGVtb2ppTGVhdmUpPVwiLi4uXCI+PC9uZ3gtZW1vamk+YC5cbiAgICAgIGlmICh0aGlzLmVtb2ppTGVhdmUub2JzZXJ2ZWQpIHtcbiAgICAgICAgdGhpcy5uZ1pvbmUucnVuKCgpID0+IHRoaXMuZW1vamlMZWF2ZS5lbWl0KHsgZW1vamksICRldmVudCB9KSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==