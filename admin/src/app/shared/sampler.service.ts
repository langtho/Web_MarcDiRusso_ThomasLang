import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { SamplerPad } from '../sampler/sampler-pad.model';

type PresetFile = {
  name: string;
  type?: string;
  isFactoryPresets?: boolean;
  samples: Array<{ url: string; name: string }>;
};

type PresetIndexEntry = {
  key: string;
  preset: PresetFile;
};

@Injectable({
  providedIn: 'root',
})
export class SamplerService {
  private readonly audioSamplerBaseUrl = 'http://localhost:3000';
  private readonly apiBaseUrl = `${this.audioSamplerBaseUrl}/api`;

  private readonly storageKey = 'audioSampler.pads.v1';
  // Rendu: pas de presets embarqués côté Angular. La source de vérité est l'API AudioSampler.

  private readonly padsSubject = new BehaviorSubject<SamplerPad[]>([]);
  readonly pads$ = this.padsSubject.asObservable();

  private initialized = false;

  constructor(private http: HttpClient) {
    this.init();
  }

  addPad(input: Omit<SamplerPad, 'id'>): void {
    const name = input.name.trim();
    const url = input.url.trim();
    if (!name || !url) return;

    if (url.startsWith('blob:')) {
      // blob: ne peut pas être stocké dans les JSON de presets.
      // On garde un fallback local (non partagé avec AudioSampler).
      const current = this.padsSubject.value;
      const pad: SamplerPad = {
        id: this.newId(),
        name,
        url,
        presetName: input.presetName?.trim() || undefined,
        categoryKey: input.categoryKey,
      };
      const next = [...current, pad];
      this.padsSubject.next(next);
      this.persist(next);
      return;
    }

    const categoryKey = input.categoryKey?.trim() || this.extractCategoryKey(url);
    if (!categoryKey) {
      // Pas de catégorie identifiable => fallback local.
      const current = this.padsSubject.value;
      const pad: SamplerPad = {
        id: this.newId(),
        name,
        url,
        presetName: input.presetName?.trim() || undefined,
      };
      const next = [...current, pad];
      this.padsSubject.next(next);
      this.persist(next);
      return;
    }

    const body = {
      name,
      url,
    };

    this.http
      .post(`${this.apiBaseUrl}/presets/${encodeURIComponent(categoryKey)}/samples`, body)
      .pipe(switchMap(() => this.loadFromAudioSampler()))
      .subscribe({
        next: (pads) => {
          this.padsSubject.next(pads);
          // On n'utilise plus le localStorage comme source de vérité, mais on le garde
          // en cache pour éviter un écran vide si l'API est temporairement indispo.
          this.persist(pads);
        },
        error: () => {
          // En cas d'erreur d'API, on fallback local.
          const current = this.padsSubject.value;
          const pad: SamplerPad = {
            id: this.newId(),
            name,
            url,
            presetName: input.presetName?.trim() || undefined,
            categoryKey,
          };
          const next = [...current, pad];
          this.padsSubject.next(next);
          this.persist(next);
        },
      });
  }

  deletePad(pad: SamplerPad): void {
    const categoryKey = pad.categoryKey?.trim() || this.extractCategoryKey(pad.url);
    const name = pad.name?.trim();

    if (!categoryKey || !name || pad.url.startsWith('blob:')) {
      // Fallback local
      const current = this.padsSubject.value;
      const next = current.filter((p) => p.id !== pad.id);
      this.padsSubject.next(next);
      this.persist(next);
      return;
    }

    this.http
      .delete(`${this.apiBaseUrl}/presets/${encodeURIComponent(categoryKey)}/samples`, {
        body: { name },
      })
      .pipe(switchMap(() => this.loadFromAudioSampler()))
      .subscribe({
        next: (pads) => {
          this.padsSubject.next(pads);
          this.persist(pads);
        },
        error: () => {
          // Fallback local si l'API échoue
          const current = this.padsSubject.value;
          const next = current.filter((p) => p.id !== pad.id);
          this.padsSubject.next(next);
          this.persist(next);
        },
      });
  }

  private init(): void {
    if (this.initialized) return;
    this.initialized = true;

    // 1) tentative API AudioSampler (source de vérité)
    this.loadFromAudioSampler().subscribe({
      next: (pads) => {
        this.padsSubject.next(pads);
        this.persist(pads);
      },
      error: () => {
        // 2) fallback cache local
        const fromStorage = this.readFromStorage();
        if (fromStorage) {
          this.padsSubject.next(fromStorage);
          return;
        }

        // 3) pas d'assets embarqués (rendu): liste vide
        this.padsSubject.next([]);
        this.persist([]);
      },
    });
  }

  private loadFromAudioSampler(): Observable<SamplerPad[]> {
    return this.http.get<PresetIndexEntry[]>(`${this.apiBaseUrl}/presets/index`).pipe(
      map((entries) => {
        const pads: SamplerPad[] = [];
        for (const entry of entries ?? []) {
          const key = entry.key;
          const preset = entry.preset;
          for (const sample of preset?.samples ?? []) {
            const normalizedUrl = this.toAudioSamplerSampleUrl(sample.url);
            pads.push({
              id: `${key}:${sample.name}`,
              name: sample.name,
              url: normalizedUrl,
              presetName: preset.name,
              categoryKey: key,
            });
          }
        }
        return pads;
      }),
    );
  }

  private toAudioSamplerSampleUrl(sampleUrl: string): string {
    const trimmed = (sampleUrl ?? '').trim();
    if (!trimmed) return '';

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;

    // preset: "./808/Kick.wav" -> "http://localhost:3000/presets/808/Kick.wav"
    const relative = trimmed.replace(/^\.\//, '').replace(/^\//, '');
    return `${this.audioSamplerBaseUrl}/presets/${relative}`;
  }

  private extractCategoryKey(url: string): string {
    const match = (url ?? '').match(/\/presets\/([^/]+)\//);
    return match?.[1] ?? '';
  }

  private readFromStorage(): SamplerPad[] | null {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return null;

      const pads: SamplerPad[] = [];
      for (const item of parsed) {
        if (!item || typeof item !== 'object') continue;
        const anyItem = item as any;
        if (typeof anyItem.id !== 'string') continue;
        if (typeof anyItem.name !== 'string') continue;
        if (typeof anyItem.url !== 'string') continue;
        pads.push({
          id: anyItem.id,
          name: anyItem.name,
          url: anyItem.url,
          presetName: typeof anyItem.presetName === 'string' ? anyItem.presetName : undefined,
          categoryKey: typeof anyItem.categoryKey === 'string' ? anyItem.categoryKey : undefined,
        });
      }

      return pads;
    } catch {
      return null;
    }
  }

  private persist(pads: SamplerPad[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(pads));
    } catch {
      // noop
    }
  }

  private newId(): string {
    // Chrome/Edge/Firefox: crypto.randomUUID() disponible.
    // Fallback simple pour éviter tout blocage.
    const c = globalThis.crypto as Crypto | undefined;
    if (c?.randomUUID) return c.randomUUID();
    return String(Date.now()) + '-' + Math.floor(Math.random() * 1_000_000);
  }
}
