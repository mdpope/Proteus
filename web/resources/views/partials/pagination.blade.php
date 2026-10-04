@if($paginator->hasPages())
<nav class="pagination" aria-label="Pagination">
    <span class="muted">{{ $paginator->firstItem() ?? 0 }}–{{ $paginator->lastItem() ?? 0 }} of {{ number_format($paginator->total()) }} · Page {{ $paginator->currentPage() }} of {{ $paginator->lastPage() }}</span>
    <div class="pagination-links">
    @unless($paginator->onFirstPage())<a class="button secondary" href="{{ $paginator->url(1) }}" aria-label="First page">First</a><a class="button secondary" href="{{ $paginator->previousPageUrl() }}" rel="prev">Previous</a>@endunless
    @if($paginator->hasMorePages())<a class="button secondary" href="{{ $paginator->nextPageUrl() }}" rel="next">Next</a><a class="button secondary" href="{{ $paginator->url($paginator->lastPage()) }}" aria-label="Last page">Last</a>@endif
    </div>
</nav>
@endif
