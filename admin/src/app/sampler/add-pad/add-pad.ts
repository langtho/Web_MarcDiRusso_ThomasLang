import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { SamplerService } from '../../shared/sampler.service';

@Component({
  selector: 'app-add-pad',
  standalone: true,
  imports: [FormsModule, MatInputModule, MatFormFieldModule, MatButtonModule, MatSelectModule],
  templateUrl: './add-pad.html',
  styleUrls: ['./add-pad.css'],
})
export class AddPad {
  name = '';
  url = '';
  categoryKey = '';
  selectedFileName = '';

  // Option 1 (MVP): URL temporaire de type blob:
  // Elle fonctionne pendant la session, mais ne persiste pas après reload.
  private pendingObjectUrl: string | null = null;

  readonly categories = ['808', 'basic-kit', 'electronic', 'hip-hop', 'steveland-vinyl'] as const;

  constructor(private samplerService: SamplerService, private router: Router) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    // Si l'utilisateur change de fichier avant d'ajouter, on nettoie l'ancienne URL.
    if (this.pendingObjectUrl) {
      URL.revokeObjectURL(this.pendingObjectUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    this.pendingObjectUrl = objectUrl;
    this.selectedFileName = file.name;
    this.url = objectUrl;

    if (!this.name.trim()) {
      this.name = file.name.replace(/\.[^/.]+$/, '');
    }
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

  onAdd(): void {
    const name = this.name.trim();
    const urlInput = this.url.trim();
    if (!name || !urlInput) return;

    const categoryKey = (this.categoryKey ?? '').trim();
    const presetName = categoryKey ? this.labelForKey(categoryKey) : undefined;
    const url = categoryKey ? this.normalizeUrlForCategory(urlInput, categoryKey) : urlInput;

    this.samplerService.addPad({
      name,
      url,
      presetName,
      categoryKey: categoryKey || undefined,
    });

    // Important: on NE révoque pas pendingObjectUrl ici, sinon l'URL blob:
    // deviendrait invalide tout de suite (et le pad ne fonctionnerait plus).
    // Elle ne persistera de toute façon pas après rechargement.
    this.pendingObjectUrl = null;

    this.router.navigate(['/home']);
  }

  private normalizeUrlForCategory(url: string, categoryKey: string): string {
    const trimmed = (url ?? '').trim();
    if (!trimmed) return '';
    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('/') ||
      trimmed.startsWith('blob:') ||
      trimmed.startsWith('data:')
    ) {
      return trimmed;
    }

    const relative = trimmed.replace(/^\.\//, '');
    // Si l'utilisateur colle un chemin du style "hip-hop/Kick.wav", on l'accepte.
    if (relative.includes('/')) {
      return `/presets/${relative}`;
    }
    // Sinon, on range le fichier sous la catégorie choisie.
    return `/presets/${categoryKey}/${relative}`;
  }
}
