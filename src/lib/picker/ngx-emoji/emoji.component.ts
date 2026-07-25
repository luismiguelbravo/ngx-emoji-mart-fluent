// modificacion 7
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { EMPTY, Subject, fromEvent, switchMap, takeUntil } from 'rxjs';

import { EmojiData } from './data/data.interfaces';
import { DEFAULT_BACKGROUNDFN, EmojiService } from './emoji.service';

export interface Emoji {
  /** Renders the native unicode emoji */
  isNative: boolean;
  forceSize: boolean;
  tooltip: boolean;
  skin: 1 | 2 | 3 | 4 | 5 | 6;
  sheetSize: 16 | 20 | 32 | 64 | 72;
  sheetRows?: number;
  set: 'apple' | 'google' | 'twitter' | 'facebook' | '';
  size: number;
  emoji: string | EmojiData;
  backgroundImageFn: (set: string, sheetSize: number) => string;
  fallback?: (data: any, props: any) => string;
  emojiOver: EventEmitter<EmojiEvent>;
  emojiLeave: EventEmitter<EmojiEvent>;
  emojiClick: EventEmitter<EmojiEvent>;
  imageUrlFn?: (emoji: EmojiData | null) => string;
}

export interface EmojiEvent {
  emoji: EmojiData;
  $event: Event;
}

@Component({
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
})
export class EmojiComponent implements OnChanges, Emoji, OnDestroy {

  get fluentEmojiUrl(): string | null {
    const data = this.getData();
    if (!data || !data.unified) return null;
    const codigoUnificado = data.unified.toLowerCase();
    return `assets/fluent-emoji/${codigoUnificado}.webp`;
  }

  get fluentEmojiStyle(): any {
    const url = this.fluentEmojiUrl;
    if (!url) return null;
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


  @Input() skin: Emoji['skin'] = 1;
  @Input() set: Emoji['set'] = 'apple';
  @Input() sheetSize: Emoji['sheetSize'] = 64;
  /** Renders the native unicode emoji */
  @Input() isNative: Emoji['isNative'] = false;
  @Input() forceSize: Emoji['forceSize'] = false;
  @Input() tooltip: Emoji['tooltip'] = false;
  @Input() size: Emoji['size'] = 24;
  @Input() emoji: Emoji['emoji'] = '';
  @Input() fallback?: Emoji['fallback'];
  @Input() hideObsolete = false;
  @Input() sheetRows?: number;
  @Input() sheetColumns?: number;
  @Input() useButton?: boolean;
  /**
   * Note: `emojiOver` and `emojiOverOutsideAngular` are dispatched on the same event (`mouseenter`), but
   *       for different purposes. The `emojiOverOutsideAngular` event is listened only in `emoji-category`
   *       component and the category component doesn't care about zone context the callback is being called in.
   *       The `emojiOver` is for backwards compatibility if anyone is listening to this event explicitly in their code.
   */
  @Output() emojiOver: Emoji['emojiOver'] = new EventEmitter();
  @Output() emojiOverOutsideAngular: Emoji['emojiOver'] = new EventEmitter();
  /** See comments above, this serves the same purpose. */
  @Output() emojiLeave: Emoji['emojiLeave'] = new EventEmitter();
  @Output() emojiLeaveOutsideAngular: Emoji['emojiLeave'] = new EventEmitter();
  @Output() emojiClick: Emoji['emojiClick'] = new EventEmitter();
  @Output() emojiClickOutsideAngular: Emoji['emojiClick'] = new EventEmitter();

  style: any;
  title?: string = undefined;
  label = '';
  unified?: string | null;
  custom = false;
  isVisible = true;
  // TODO: replace 4.0.3 w/ dynamic get verison from emoji-datasource in package.json
  @Input() backgroundImageFn: Emoji['backgroundImageFn'] = DEFAULT_BACKGROUNDFN;
  @Input() imageUrlFn?: Emoji['imageUrlFn'];

  @ViewChild('button', { static: false })
  set button(button: ElementRef<HTMLElement> | undefined) {
    // Note: `runOutsideAngular` is used to trigger `addEventListener` outside of the Angular zone
    //       too. See `setupMouseEnterListener`. The `switchMap` will subscribe to `fromEvent` considering
    //       the context where the factory is called in.
    this.ngZone.runOutsideAngular(() => this.button$.next(button?.nativeElement));
  }

  /**
   * The subject used to emit whenever view queries are run and `button` or `span` is set/removed.
   * We use subject to keep the reactive behavior so we don't have to add and remove event listeners manually.
   */
  private readonly button$ = new Subject<HTMLElement | undefined>();

  private readonly destroy$ = new Subject<void>();

  private readonly ngZone = inject(NgZone);
  private readonly emojiService = inject(EmojiService);

  constructor() {
    this.setupMouseListeners();
  }


unifiedText?: string | null = null;
  fluentUrl: string | null = null;

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
    } else{
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



private isMissingAsset(unified?: string): boolean {
    if (!unified) return true;
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
      '1f3f4-e0067-e0062-e0065-e006e-e0067-e007f', // Inglaterra
      '1f3f4-e0067-e0062-e0073-e0063-e0074-e007f', // Escocia
      '1f3f4-e0067-e0062-e0077-e006c-e0073-e007f'  // Gales
    ]);

    if (missingAssets.has(lowerUnified)) {
      return true;
    }

    // Patrón genérico por si aparece alguna otra variante con ZWJ
    return lowerUnified.includes('200d');
  }


  ngOnDestroy(): void {
    this.destroy$.next();
  }

  getData() {
    return this.emojiService.getData(this.emoji, this.skin, this.set);
  }

  getSanitizedData(): EmojiData {
    return this.emojiService.getSanitizedData(this.emoji, this.skin, this.set) as EmojiData;
  }

  private setupMouseListeners(): void {
    const eventListener$ = (eventName: string) =>
      this.button$.pipe(
        // Note: `EMPTY` is used to remove event listener once the DOM node is removed.
        switchMap(button => (button ? fromEvent(button, eventName) : EMPTY)),
        takeUntil(this.destroy$),
      );

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
}
