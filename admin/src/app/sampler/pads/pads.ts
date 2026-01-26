import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { AsyncPipe } from '@angular/common';
import { combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { SamplerService } from '../../shared/sampler.service';
import { SamplerPad } from '../sampler-pad.model';

@Component({
  selector: 'app-pads',
  standalone: true,
  imports: [
    RouterLink,
    AsyncPipe,
    MatDividerModule,
    MatButtonModule,
    MatTableModule,
  ],
  templateUrl: './pads.html',
  styleUrls: ['./pads.css'],
})
export class Pads {
  categoryKey$!: Observable<string>;
  categoryLabel$!: Observable<string>;
  pads$!: Observable<SamplerPad[]>;

  constructor(private samplerService: SamplerService, private route: ActivatedRoute) {
    this.categoryKey$ = this.route.paramMap.pipe(map((p) => p.get('key') ?? ''));
    this.categoryLabel$ = combineLatest([samplerService.presetIndex$, this.categoryKey$]).pipe(
      map(([entries, key]) => {
        if (!key) return '';
        const entry = (entries ?? []).find((e) => e?.key === key);
        return String(entry?.preset?.name ?? '').trim() || this.labelForKey(key);
      }),
    );
    this.pads$ = combineLatest([samplerService.pads$, this.categoryKey$]).pipe(
      map(([pads, key]) => {
        if (!key) return pads;
        return pads.filter((pad) => this.extractCategoryKey(pad.url) === key);
      }),
    );
  }

  onRename(categoryKey: string, currentLabel: string): void {
    const next = window.prompt('Nouveau nom du preset :', currentLabel);
    if (!next) return;
    this.samplerService.renamePreset(categoryKey, next);
  }

  onDelete(pad: SamplerPad): void {
    this.samplerService.deletePad(pad);
  }

  onRenameSound(pad: SamplerPad): void {
    const next = window.prompt('Nouveau nom du son :', pad.name);
    if (!next) return;
    this.samplerService.renameSound(pad, next);
  }

  private extractCategoryKey(url: string): string {
    const match = (url ?? '').match(/\/presets\/([^/]+)\//);
    return match?.[1] ?? '';
  }

  private labelForKey(key: string): string {
    const labels: Record<string, string> = {
      '808': '808',
      'basic-kit': 'Basic Kit',
      electronic: 'Electronic',
      'hip-hop': 'Hip-Hop',
      'steveland-vinyl': 'Steveland Vinyl',
    };
    return labels[key] ?? key;
  }
}
