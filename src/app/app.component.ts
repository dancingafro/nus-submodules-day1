import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LinkService, ShortLink } from './link.service';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  private readonly linkService = inject(LinkService);

  readonly links = signal<ShortLink[]>([]);
  readonly url = signal('');
  readonly createdLink = signal<ShortLink | null>(null);
  readonly formError = signal('');
  readonly listError = signal('');
  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);

  ngOnInit(): void {
    void this.loadLinks();
  }

  onUrlInput(event: Event): void {
    this.url.set((event.target as HTMLInputElement).value);
    this.formError.set('');
    this.createdLink.set(null);
  }

  async createLink(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    this.formError.set('');
    this.createdLink.set(null);

    const value = this.url().trim();
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(value);
    } catch {
      this.formError.set('Enter a valid http or https URL.');
      return;
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      this.formError.set('Only http and https URLs are supported.');
      return;
    }

    this.isSubmitting.set(true);
    try {
      const link = await firstValueFrom(this.linkService.createLink(parsedUrl.href));
      this.links.update((links) => [link, ...links]);
      this.createdLink.set(link);
      this.url.set('');
    } catch (error) {
      this.formError.set(this.describeError(error));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private async loadLinks(): Promise<void> {
    this.isLoading.set(true);
    this.listError.set('');
    try {
      this.links.set(await firstValueFrom(this.linkService.getLinks()));
    } catch (error) {
      this.listError.set(this.describeError(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  private describeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const apiMessage = error.error?.error;
      if (typeof apiMessage === 'string') return apiMessage;
      if (error.status === 0) return 'Could not reach the Snip API at localhost:3000.';
    }
    return 'Something went wrong. Please try again.';
  }
}
