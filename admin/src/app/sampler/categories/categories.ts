import { Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { map } from 'rxjs/operators';

import { SamplerService } from '../../shared/sampler.service';
import { SamplerPad } from '../sampler-pad.model';

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
    this.categories$ = this.samplerService.pads$.pipe(map((pads) => this.computeCategories(pads)));
  }

  labelForKey(key: string): string {
    const labels: Record<string, string> = {
      '808': '808',
      'basic-kit': 'Basic Kit',
      electronic: 'Electronic',
      'hip-hop': 'Hip-Hop',
      'steveland-vinyl': 'Steveland Vinyl',
    };
    return labels[key] ?? key;
  }

  private computeCategories(pads: SamplerPad[]): string[] {
    const preferredOrder = ['808', 'basic-kit', 'electronic', 'hip-hop', 'steveland-vinyl'];

    const fromPads = new Set<string>();
    for (const pad of pads) {
      const key = this.extractCategoryKey(pad.url);
      if (key) fromPads.add(key);
    }

    const ordered: string[] = [];
    for (const key of preferredOrder) {
      if (fromPads.has(key)) ordered.push(key);
    }

    const rest = Array.from(fromPads)
      .filter((k) => !preferredOrder.includes(k))
      .sort((a, b) => a.localeCompare(b));

    return [...ordered, ...rest];
  }

  private extractCategoryKey(url: string): string {
    const match = (url ?? '').match(/\/presets\/([^/]+)\//);
    return match?.[1] ?? '';
  }
}
