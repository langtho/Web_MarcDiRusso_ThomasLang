import { Routes } from '@angular/router';
import { Categories } from './sampler/categories/categories';
import { Pads } from './sampler/pads/pads';
import { AddPad } from './sampler/add-pad/add-pad';


export const routes: Routes = [
    { path: '', redirectTo: 'home', pathMatch: 'full' },
    
    { path: 'home', component: Categories },
    { path: 'category/:key', component: Pads },
    { path: 'category', redirectTo: 'home', pathMatch: 'full' },
    { path: 'add', component: AddPad },
    { path: '**', redirectTo: 'home' },
];
