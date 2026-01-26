import { Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { map } from 'rxjs/operators';

import { SamplerService } from '../../shared/sampler.service';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [AsyncPipe, RouterLink, MatDividerModule, MatListModule],
  templateUrl: './categories.html',
  styleUrls: ['./categories.css'],
})
export class Categories {
  categories$;

  constructor(private samplerService: SamplerService) {
    this.categories$ = this.samplerService.presetIndex$.pipe(
      map((entries) => this.computeCategories(entries)),
    );
  }

  private labelFallbackForKey(key: string): string {
    const labels: Record<string, string> = {
      '808': '808',
      'basic-kit': 'Basic Kit',
      electronic: 'Electronic',
      'hip-hop': 'Hip-Hop',
      'steveland-vinyl': 'Steveland Vinyl',
    };
    return labels[key] ?? key;
  }

  private computeCategories(entries: Array<{ key: string; preset?: { name?: string } }>): Array<{ key: string; label: string }> {
    const preferredOrder = ['808', 'basic-kit', 'electronic', 'hip-hop', 'steveland-vinyl'];

    const byKey = new Map<string, string>();
    for (const entry of entries ?? []) {
      const key = String(entry?.key ?? '').trim();
      if (!key) continue;
      const label = String(entry?.preset?.name ?? '').trim() || this.labelFallbackForKey(key);
      if (!byKey.has(key)) byKey.set(key, label);
    }

    const ordered: Array<{ key: string; label: string }> = [];
    for (const key of preferredOrder) {
      if (byKey.has(key)) ordered.push({ key, label: byKey.get(key) ?? this.labelFallbackForKey(key) });
    }

    const restKeys = Array.from(byKey.keys())
      .filter((k) => !preferredOrder.includes(k))
      .sort((a, b) => a.localeCompare(b));

    for (const key of restKeys) {
      ordered.push({ key, label: byKey.get(key) ?? key });
    }

    return ordered;
  }
}
